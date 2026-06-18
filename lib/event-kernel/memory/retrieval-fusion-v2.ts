import {
  containsDeicticReference,
} from "@/lib/event-kernel/memory/collect-memory-hints";
import { memoryKeysMatch, normalizeMemoryKey } from "@/lib/event-kernel/memory/normalize-memory-key";
import type {
  EventKernelMemoryState,
  KernelMemoryEvent,
  KernelMemoryItem,
} from "@/lib/event-kernel/memory/types";
import type { KernelMemoryBias } from "@/lib/event-kernel/search-planner/types";
import { topicTokens } from "@/lib/action-chat/intent-router-core";

export type RankedMemoryItem = {
  id: string;
  label: string;
  source: "stm" | "wm" | "ltm" | "session_topic" | "active_link" | "memory_bias";
  kind?: KernelMemoryItem["kind"];
};

export type RankedMemory = {
  item: RankedMemoryItem;
  deicticScore: number;
  semanticScore: number;
  temporalScore: number;
};

export type RetrievalFusionV2Input = {
  message: string;
  memory: EventKernelMemoryState | null | undefined;
  memory_bias?: readonly KernelMemoryBias[];
  now?: string;
};

function recencyMs(iso: string | undefined, nowMs: number): number {
  if (!iso) {
    return 0;
  }
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  const age = Math.max(0, nowMs - parsed);
  return 1 / (1 + age / 3_600_000);
}

function semanticOverlap(message: string, label: string): number {
  const msgTokens = new Set(topicTokens(message).map((t) => t.toLowerCase()));
  const labelTokens = topicTokens(label);
  if (labelTokens.length === 0) {
    return 0;
  }
  let hits = 0;
  for (const token of labelTokens) {
    if (msgTokens.has(token.toLowerCase())) {
      hits += 1;
    }
  }
  return hits / labelTokens.length;
}

function deicticAffinity(message: string, source: RankedMemoryItem["source"]): number {
  if (!containsDeicticReference(message)) {
    return source === "session_topic" || source === "wm" ? 0.35 : 0.2;
  }
  switch (source) {
    case "session_topic":
      return 0.95;
    case "wm":
      return 0.82;
    case "stm":
      return 0.78;
    case "active_link":
      return 0.7;
    case "ltm":
      return 0.65;
    case "memory_bias":
      return 0.6;
    default:
      return 0.25;
  }
}

function pushCandidate(
  map: Map<string, RankedMemory>,
  item: RankedMemoryItem,
  input: { message: string; nowMs: number; weight?: number; lastSeenAt?: string }
) {
  const key = normalizeMemoryKey(item.label) || item.id;
  const semanticScore = Math.min(
    1,
    semanticOverlap(input.message, item.label) * 0.7 +
      (input.weight ?? 0.5) * 0.3
  );
  const temporalScore = recencyMs(input.lastSeenAt, input.nowMs);
  const deicticScore = deicticAffinity(input.message, item.source);
  const existing = map.get(key);
  const next: RankedMemory = {
    item,
    deicticScore: Math.max(existing?.deicticScore ?? 0, deicticScore),
    semanticScore: Math.max(existing?.semanticScore ?? 0, semanticScore),
    temporalScore: Math.max(existing?.temporalScore ?? 0, temporalScore),
  };
  map.set(key, next);
}

function fromStmEvents(
  map: Map<string, RankedMemory>,
  stm: readonly KernelMemoryEvent[],
  input: { message: string; nowMs: number }
) {
  for (const event of stm) {
    for (const entity of event.entities) {
      if (!entity.trim()) {
        continue;
      }
      pushCandidate(
        map,
        { id: event.id, label: entity, source: "stm" },
        { message: input.message, nowMs: input.nowMs, weight: event.weight, lastSeenAt: event.at }
      );
    }
    if (event.topic?.trim()) {
      pushCandidate(
        map,
        { id: `${event.id}:topic`, label: event.topic, source: "stm", kind: "topic" },
        { message: input.message, nowMs: input.nowMs, weight: event.weight, lastSeenAt: event.at }
      );
    }
  }
}

function fromItems(
  map: Map<string, RankedMemory>,
  items: readonly KernelMemoryItem[],
  source: "wm" | "ltm",
  input: { message: string; nowMs: number }
) {
  for (const item of items) {
    if (item.lifecycle === "forgotten") {
      continue;
    }
    pushCandidate(
      map,
      { id: item.id, label: item.label, source, kind: item.kind },
      {
        message: input.message,
        nowMs: input.nowMs,
        weight: item.weight,
        lastSeenAt: item.lastSeenAt,
      }
    );
  }
}

/**
 * RETRIEVAL FUSION v2 — read-only ranked suggestions; no routing or execution influence.
 */
export function retrievalFusionV2(input: RetrievalFusionV2Input): RankedMemory[] {
  const memory = input.memory;
  if (!memory) {
    return [];
  }

  const message = input.message.trim();
  const nowMs = input.now ? Date.parse(input.now) : Date.now();
  const map = new Map<string, RankedMemory>();

  if (memory.session_topic?.trim()) {
    pushCandidate(
      map,
      {
        id: "session_topic",
        label: memory.session_topic.trim(),
        source: "session_topic",
        kind: "topic",
      },
      { message, nowMs, weight: 1, lastSeenAt: memory.updated_at }
    );
  }

  fromStmEvents(map, memory.stm, { message, nowMs });
  fromItems(map, memory.wm, "wm", { message, nowMs });
  fromItems(map, memory.ltm, "ltm", { message, nowMs });

  for (const link of memory.active_links) {
    const stmById = new Map(memory.stm.map((event) => [event.id, event]));
    const to = stmById.get(link.toId);
    const label = to?.entities[0] ?? to?.topic ?? to?.gist ?? link.toId;
    pushCandidate(
      map,
      { id: `link:${link.fromId}:${link.toId}`, label, source: "active_link" },
      { message, nowMs, weight: link.weight, lastSeenAt: to?.at }
    );
  }

  for (const bias of input.memory_bias ?? []) {
    if (!bias.label.trim()) {
      continue;
    }
    pushCandidate(
      map,
      { id: `bias:${bias.source}:${bias.label}`, label: bias.label, source: "memory_bias" },
      { message, nowMs, weight: bias.weight, lastSeenAt: memory.updated_at }
    );
  }

  return [...map.values()].sort((left, right) => {
    const leftSum =
      left.deicticScore + left.semanticScore + left.temporalScore;
    const rightSum =
      right.deicticScore + right.semanticScore + right.temporalScore;
    if (rightSum !== leftSum) {
      return rightSum - leftSum;
    }
    return right.semanticScore - left.semanticScore;
  });
}

/** Map fusion output to legacy MemoryHintCandidate shape (suggestion only). */
export function rankedMemoriesToHintCandidates(
  ranked: readonly RankedMemory[]
): Array<{ entity: string; score: number; source: string }> {
  const out: Array<{ entity: string; score: number; source: string }> = [];
  for (const entry of ranked) {
    const entity = entry.item.label.trim();
    if (!entity) {
      continue;
    }
    if (out.some((row) => memoryKeysMatch(row.entity, entity))) {
      continue;
    }
    const score =
      (entry.deicticScore + entry.semanticScore + entry.temporalScore) / 3;
    out.push({
      entity,
      score,
      source: entry.item.source,
    });
  }
  return out.slice(0, 5);
}
