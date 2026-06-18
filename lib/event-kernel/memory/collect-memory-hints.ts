import {
  extractCurrentTopic,
  priorHistoryForRoute,
  scoreTopicRelevance,
  topicTokens,
} from "@/lib/action-chat/intent-router-core";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { memoryKeysMatch } from "@/lib/event-kernel/memory/normalize-memory-key";
import type { EventKernelMemoryState } from "@/lib/event-kernel/memory/types";
import type { MemoryHintCandidate, MemoryHints } from "@/lib/event-kernel/intent-kernel-system/types";

const DEICTIC_TOKEN = /(?:그거|그게|저거|이거|아까\s*(?:그\s*)?)/iu;

const NON_ENTITY_LABEL =
  /^(?:general(?:_search)?|place_search|price_inquiry|navigation|hours_inquiry|reservation|review_inquiry|unknown|info)$/iu;

function isUsableEntity(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length < 2) {
    return false;
  }
  if (NON_ENTITY_LABEL.test(trimmed.toLowerCase())) {
    return false;
  }
  if (/_search$|_inquiry$/iu.test(trimmed)) {
    return false;
  }
  return true;
}

function entityFromLabel(label: string): string {
  if (!isUsableEntity(label)) {
    return "";
  }
  const tokens = topicTokens(label);
  return tokens[0] ?? label.trim().slice(0, 24);
}

export function containsDeicticReference(message: string): boolean {
  return DEICTIC_TOKEN.test(message.trim());
}

function dedupeCandidates(items: MemoryHintCandidate[]): MemoryHintCandidate[] {
  const out: MemoryHintCandidate[] = [];
  for (const item of items.sort((a, b) => b.score - a.score)) {
    if (out.some((existing) => memoryKeysMatch(existing.entity, item.entity))) {
      continue;
    }
    out.push(item);
  }
  return out.slice(0, 5);
}

/**
 * §3 MEMORY — suggestion only.
 * Returns candidate entities and scores. Does NOT decide routing.
 */
export function collectMemoryHints(input: {
  message: string;
  history?: OrchestrateHistoryTurn[];
  memory?: EventKernelMemoryState | null;
  linkTitle?: string | null;
  frameEntities?: readonly string[];
}): MemoryHints {
  const message = input.message.trim();
  const snippets: string[] = [];
  const rawCandidates: MemoryHintCandidate[] = [];

  if (input.memory?.session_topic?.trim()) {
    snippets.push(input.memory.session_topic.trim().slice(0, 80));
  }

  const prior = priorHistoryForRoute(input.history, message);
  for (let index = prior.length - 1; index >= 0 && snippets.length < 3; index -= 1) {
    const turn = prior[index]!;
    if (turn.content.trim().length >= 4) {
      snippets.push(`${turn.role}:${turn.content.trim().slice(0, 60)}`);
    }
  }

  if (!containsDeicticReference(message)) {
    return { candidates: [], scores: [], snippets };
  }

  if (input.memory?.session_topic?.trim()) {
    const entity = entityFromLabel(input.memory.session_topic);
    if (entity) {
      rawCandidates.push({ entity, score: 0.88, source: "session_topic" });
    }
  }

  for (const item of input.memory?.wm ?? []) {
    if (item.kind !== "entity" && item.kind !== "topic") {
      continue;
    }
    const entity = entityFromLabel(item.label);
    if (!entity) {
      continue;
    }
    rawCandidates.push({
      entity,
      score: Math.min(0.92, 0.72 + item.weight * 0.08),
      source: "wm",
    });
  }

  const latestStm = input.memory?.stm[input.memory.stm.length - 1];
  if (latestStm?.entities[0]) {
    rawCandidates.push({
      entity: latestStm.entities[0]!,
      score: 0.78,
      source: "stm",
    });
  }

  const topic = extractCurrentTopic({
    history: input.history,
    linkTitle: input.linkTitle,
    currentMessage: message,
  });
  if (topic) {
    const entity = entityFromLabel(topic);
    if (entity) {
      rawCandidates.push({
        entity,
        score: Math.min(0.86, 0.62 + scoreTopicRelevance(topic, message) * 0.35),
        source: "history_topic",
      });
    }
  }

  if (input.linkTitle?.trim()) {
    const entity = entityFromLabel(input.linkTitle);
    if (entity) {
      rawCandidates.push({ entity, score: 0.71, source: "link" });
    }
  }

  for (let index = prior.length - 1; index >= 0; index -= 1) {
    const turn = prior[index]!;
    if (turn.role !== "user") {
      continue;
    }
    const tokens = topicTokens(turn.content).filter((token) => isUsableEntity(token));
    if (tokens.length >= 1) {
      rawCandidates.push({ entity: tokens[0]!, score: 0.82, source: "history_user" });
      break;
    }
  }

  const candidates = dedupeCandidates(rawCandidates);
  return {
    candidates,
    scores: candidates.map((item) => item.score),
    snippets,
  };
}
