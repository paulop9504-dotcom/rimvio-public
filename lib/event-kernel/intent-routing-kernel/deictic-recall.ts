import {
  extractCurrentTopic,
  priorHistoryForRoute,
  scoreTopicRelevance,
  topicTokens,
} from "@/lib/action-chat/intent-router-core";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { memoryKeysMatch } from "@/lib/event-kernel/memory/normalize-memory-key";
import type { EventKernelMemoryState } from "@/lib/event-kernel/memory/types";

const DEICTIC_TOKEN = /(?:그거|그게|저거|이거|아까\s*(?:그\s*)?)/iu;
const ATTRIBUTE_PATTERN =
  /(?:가격|얼마|위치|어디|영업|전화|주차|메뉴|예약|정보|뭐(?:였|더|야)?)/iu;

export type DeicticRecallResult = {
  resolved: boolean;
  entity: string | null;
  attribute: string | null;
  confidence: number;
  source: "session_topic" | "wm" | "stm" | "history" | "link" | null;
};

function extractAttribute(message: string): string | null {
  const trimmed = message.trim();
  if (/^(?:그거|그게|저거|이거)\s*뭐(?:였|더|야)?(?:지|어|나|까|더라)?/iu.test(trimmed)) {
    return null;
  }
  const match = message.match(ATTRIBUTE_PATTERN);
  const value = match?.[0]?.trim() ?? null;
  if (value && /^뭐(?:였|더|야)?(?:지|어|나|까)?$/iu.test(value)) {
    return null;
  }
  return value;
}

const NON_ENTITY_LABEL =
  /^(?:general(?:_search)?|place_search|price_inquiry|navigation|hours_inquiry|reservation|review_inquiry|unknown|info)$/iu;

function isUsableRecallEntity(label: string): boolean {
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
  if (!isUsableRecallEntity(label)) {
    return "";
  }
  const tokens = topicTokens(label);
  return tokens[0] ?? label.trim().slice(0, 24);
}

export function containsDeicticReference(message: string): boolean {
  return DEICTIC_TOKEN.test(message.trim());
}

/** §2 — resolve deictic reference from recent context before CLARIFY. */
export function attemptDeicticRecall(input: {
  message: string;
  history?: OrchestrateHistoryTurn[];
  memory?: EventKernelMemoryState | null;
  linkTitle?: string | null;
  frameEntities?: readonly string[];
}): DeicticRecallResult {
  const message = input.message.trim();
  const attribute = extractAttribute(message);

  if (!containsDeicticReference(message)) {
    return {
      resolved: false,
      entity: null,
      attribute,
      confidence: 0,
      source: null,
    };
  }

  const candidates: Array<{ entity: string; confidence: number; source: DeicticRecallResult["source"] }> = [];

  if (input.memory?.session_topic?.trim()) {
    const entity = entityFromLabel(input.memory.session_topic);
    if (entity) {
      candidates.push({
        entity,
        confidence: 0.88,
        source: "session_topic",
      });
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
    candidates.push({
      entity,
      confidence: Math.min(0.92, 0.72 + item.weight * 0.08),
      source: "wm",
    });
  }

  const latestStm = input.memory?.stm[input.memory.stm.length - 1];
  if (latestStm?.entities[0]) {
    candidates.push({
      entity: latestStm.entities[0]!,
      confidence: 0.78,
      source: "stm",
    });
  }

  if (input.frameEntities?.[0]?.trim()) {
    const entity = entityFromLabel(input.frameEntities[0]!);
    if (entity) {
      candidates.push({
        entity,
        confidence: 0.74,
        source: "history",
      });
    }
  }

  const topic = extractCurrentTopic({
    history: input.history,
    linkTitle: input.linkTitle,
    currentMessage: message,
  });
  if (topic) {
    const entity = entityFromLabel(topic);
    if (entity) {
      const relevance = scoreTopicRelevance(topic, message);
      candidates.push({
        entity,
        confidence: Math.min(0.86, 0.62 + relevance * 0.35),
        source: "history",
      });
    }
  }

  if (input.linkTitle?.trim()) {
    const entity = entityFromLabel(input.linkTitle);
    if (entity) {
      candidates.push({
        entity,
        confidence: 0.71,
        source: "link",
      });
    }
  }

  const prior = priorHistoryForRoute(input.history, message);
  for (let index = prior.length - 1; index >= 0; index -= 1) {
    const turn = prior[index]!;
    if (turn.role !== "user") {
      continue;
    }
    const tokens = topicTokens(turn.content).filter((token) => isUsableRecallEntity(token));
    if (tokens.length >= 1) {
      candidates.push({
        entity: tokens[0]!,
        confidence: 0.82,
        source: "history",
      });
      break;
    }
  }

  const ranked = candidates
    .filter((item) => item.entity.trim().length >= 2)
    .sort((a, b) => b.confidence - a.confidence);

  const best = ranked[0];
  if (!best) {
    return {
      resolved: false,
      entity: null,
      attribute,
      confidence: 0,
      source: null,
    };
  }

  const deduped = ranked.find(
    (item, index) =>
      index === 0 ||
      !memoryKeysMatch(item.entity, best.entity)
  );

  return {
    resolved: false,
    entity: best.entity,
    attribute,
    confidence: best.confidence,
    source: best.source,
  };
}

export function buildRecalledCanonicalQuery(entity: string, attribute: string | null): string {
  if (attribute && !entity.includes(attribute)) {
    return `${entity} ${attribute}`.trim();
  }
  return entity.trim();
}
