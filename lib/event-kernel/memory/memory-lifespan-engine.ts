import { memoryKeysMatch, normalizeMemoryKey } from "@/lib/event-kernel/memory/normalize-memory-key";
import type {
  EventKernelMemoryState,
  KernelMemoryItem,
  KernelMemoryItemKind,
  MemoryLifecycleStage,
} from "@/lib/event-kernel/memory/types";

export type MemoryLifecycleEventType = "DECAY" | "REINFORCE" | "COMPRESS" | "FORGET";

export type MemoryLifecycleEvent = {
  type: MemoryLifecycleEventType;
  target: string;
  reason: string;
};

export type MemoryAccessLogEntry = {
  memoryId: string;
  key: string;
  at: string;
};

export type MemoryRetrievalStats = {
  hitsById: Record<string, number>;
  hitsByKey: Record<string, number>;
  lastRetrievedAt: Record<string, string>;
};

export type MemoryLifespanInput = {
  memoryState: EventKernelMemoryState;
  retrievalStats: MemoryRetrievalStats;
  accessLog: readonly MemoryAccessLogEntry[];
  now?: string;
};

export type MemoryLifespanResult = {
  updatedMemoryState: EventKernelMemoryState;
  lifecycleEvents: MemoryLifecycleEvent[];
};

/** Internal lifecycle tuning — not exposed to kernel routing. */
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DORMANT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const FORGET_IDLE_MS = 14 * 24 * 60 * 60 * 1000;
const DECAY_FACTOR = 0.88;
const REINFORCE_DELTA = 0.28;
const COMPRESS_MIN_SIBLINGS = 2;
const FORGET_WEIGHT_MAX = 0.2;
const COMPRESSED_LABEL_SUFFIX = "관련 반복 탐색 패턴";

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ageMs(iso: string, nowMs: number): number {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, nowMs - parsed);
}

function entityAnchor(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }
  const firstToken = trimmed.split(/\s+/)[0] ?? trimmed;
  const key = normalizeMemoryKey(firstToken);
  return key || null;
}

function resolveLifecycleStage(input: {
  item: KernelMemoryItem;
  nowMs: number;
  accessedThisTurn: boolean;
  retrievalHits: number;
}): MemoryLifecycleStage {
  if (input.item.lifecycle === "compressed") {
    return "compressed";
  }
  if (input.accessedThisTurn || ageMs(input.item.lastSeenAt, input.nowMs) <= ACTIVE_WINDOW_MS) {
    return "active";
  }
  if (input.retrievalHits > 0 || input.item.hitCount >= 2) {
    return "dormant";
  }
  return "dormant";
}

function reinforceItem(
  item: KernelMemoryItem,
  now: string,
  retrievalHits: number
): KernelMemoryItem {
  const boost = REINFORCE_DELTA + retrievalHits * 0.08;
  return {
    ...item,
    weight: item.weight + boost,
    hitCount: item.hitCount + (retrievalHits > 0 ? 1 : 0),
    lastSeenAt: now,
    lifecycle: "active",
  };
}

function decayItem(item: KernelMemoryItem): KernelMemoryItem {
  return {
    ...item,
    weight: item.weight * DECAY_FACTOR,
    lifecycle: item.lifecycle === "compressed" ? "compressed" : "dormant",
  };
}

function shouldForget(input: {
  item: KernelMemoryItem;
  nowMs: number;
  retrievalHits: number;
  accessedThisTurn: boolean;
}): boolean {
  if (input.accessedThisTurn || input.retrievalHits > 0) {
    return false;
  }
  if (input.item.lifecycle === "compressed") {
    return false;
  }
  if (input.item.hitCount > 1 && input.item.weight >= 0.35) {
    return false;
  }
  const idle = ageMs(input.item.lastSeenAt, input.nowMs);
  return (
    input.item.hitCount <= 1 &&
    input.item.weight <= FORGET_WEIGHT_MAX &&
    idle >= FORGET_IDLE_MS
  );
}

function compressEntityGroup(
  anchor: string,
  items: KernelMemoryItem[],
  now: string
): { merged: KernelMemoryItem; removedIds: string[] } {
  const sorted = [...items].sort((a, b) => b.weight - a.weight);
  const head = sorted[0]!;
  const totalWeight = items.reduce((sum, row) => sum + row.weight, 0);
  const totalHits = items.reduce((sum, row) => sum + row.hitCount, 0);
  const displayAnchor = head.label.split(/\s+/)[0]?.trim() || anchor;

  const merged: KernelMemoryItem = {
    id: createId("ltm-compressed"),
    key: `compressed:${anchor}`,
    label: `${displayAnchor} ${COMPRESSED_LABEL_SUFFIX}`,
    kind: "topic" satisfies KernelMemoryItemKind,
    weight: Math.max(totalWeight, 2.5),
    hitCount: totalHits,
    lastSeenAt: now,
    lifecycle: "compressed",
  };

  return {
    merged,
    removedIds: items.map((row) => row.id),
  };
}

/**
 * MEMORY LIFESPAN ENGINE — post-storage lifecycle only.
 * Does NOT decide intent, execute actions, or duplicate Memory Writer fold logic.
 */
export function runMemoryLifespanEngine(input: MemoryLifespanInput): MemoryLifespanResult {
  const now = input.now ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const events: MemoryLifecycleEvent[] = [];

  const accessedIds = new Set(input.accessLog.map((entry) => entry.memoryId));
  const accessedKeys = new Set(input.accessLog.map((entry) => entry.key));

  let wm = [...input.memoryState.wm];
  let ltm = [...input.memoryState.ltm];

  const retrievalHitsFor = (item: KernelMemoryItem): number => {
    return (
      input.retrievalStats.hitsById[item.id] ??
      input.retrievalStats.hitsByKey[item.key] ??
      0
    );
  };

  const accessedThisTurn = (item: KernelMemoryItem): boolean =>
    accessedIds.has(item.id) ||
    accessedKeys.has(item.key) ||
    [...input.accessLog].some((entry) => memoryKeysMatch(entry.key, item.label));

  // 1) Reinforcement — reuse and retrieval hits
  const reinforce = (items: KernelMemoryItem[], tier: "wm" | "ltm"): KernelMemoryItem[] =>
    items.map((item) => {
      const hits = retrievalHitsFor(item);
      const accessed = accessedThisTurn(item);
      if (!accessed && hits === 0) {
        return item;
      }
      const next = reinforceItem(item, now, hits);
      if (next.weight !== item.weight || next.lifecycle !== item.lifecycle) {
        events.push({
          type: "REINFORCE",
          target: item.id,
          reason:
            hits > 0
              ? `${tier} retrieval hit (${hits}) or turn access`
              : `${tier} reinforced from turn access log`,
        });
      }
      return next;
    });

  wm = reinforce(wm, "wm");
  ltm = reinforce(ltm, "ltm");

  // 2) Decay — idle WM items (not compressed)
  wm = wm.flatMap((item) => {
    if (item.lifecycle === "compressed" || accessedThisTurn(item)) {
      return [item];
    }
    const idle = ageMs(item.lastSeenAt, nowMs);
    if (idle < DORMANT_WINDOW_MS) {
      return [item];
    }
    const next = decayItem(item);
    if (next.weight < item.weight) {
      events.push({
        type: "DECAY",
        target: item.id,
        reason: `wm idle ${Math.round(idle / 3_600_000)}h without access`,
      });
    }
    return [next];
  });

  // 3) Compression — same entity anchor, overlapping topic
  const compressPool = [...wm, ...ltm].filter((item) => item.lifecycle !== "compressed");
  const byAnchor = new Map<string, KernelMemoryItem[]>();
  for (const item of compressPool) {
    const anchor = entityAnchor(item.label);
    if (!anchor) {
      continue;
    }
    const bucket = byAnchor.get(anchor) ?? [];
    bucket.push(item);
    byAnchor.set(anchor, bucket);
  }

  const compressedIds = new Set<string>();
  const compressedLtm: KernelMemoryItem[] = [];

  for (const [anchor, group] of byAnchor) {
    if (group.length < COMPRESS_MIN_SIBLINGS) {
      continue;
    }
    const distinctLabels = new Set(group.map((row) => normalizeMemoryKey(row.label)));
    if (distinctLabels.size < COMPRESS_MIN_SIBLINGS) {
      continue;
    }

    const { merged, removedIds } = compressEntityGroup(anchor, group, now);
    for (const id of removedIds) {
      compressedIds.add(id);
    }
    compressedLtm.push(merged);
    events.push({
      type: "COMPRESS",
      target: merged.id,
      reason: `merged ${group.length} memories for entity "${anchor}"`,
    });
  }

  if (compressedIds.size > 0) {
    wm = wm.filter((item) => !compressedIds.has(item.id));
    ltm = ltm.filter((item) => !compressedIds.has(item.id));
    ltm = [...ltm, ...compressedLtm];
  }

  // 4) Forgetting — low semantic value, no hits
  const forgetFrom = (items: KernelMemoryItem[], tier: "wm" | "ltm") =>
    items.filter((item) => {
      if (shouldForget({ item, nowMs, retrievalHits: retrievalHitsFor(item), accessedThisTurn: accessedThisTurn(item) })) {
        events.push({
          type: "FORGET",
          target: item.id,
          reason: `${tier} single-use, low weight, no retrieval reinforcement`,
        });
        return false;
      }
      return true;
    });

  wm = forgetFrom(wm, "wm");
  ltm = forgetFrom(ltm, "ltm");

  // 5) Lifecycle stage labels for retrieval surface
  wm = wm.map((item) => ({
    ...item,
    lifecycle: resolveLifecycleStage({
      item,
      nowMs,
      accessedThisTurn: accessedThisTurn(item),
      retrievalHits: retrievalHitsFor(item),
    }),
  }));
  ltm = ltm.map((item) => ({
    ...item,
    lifecycle:
      item.lifecycle === "compressed"
        ? "compressed"
        : resolveLifecycleStage({
            item,
            nowMs,
            accessedThisTurn: accessedThisTurn(item),
            retrievalHits: retrievalHitsFor(item),
          }),
  }));

  return {
    updatedMemoryState: {
      ...input.memoryState,
      wm,
      ltm,
      updated_at: now,
    },
    lifecycleEvents: events,
  };
}

/** Build retrieval stats from fusion output (read-path derived; no kernel influence). */
export function buildMemoryRetrievalStats(
  hits: Array<{ id: string; key: string; at?: string }>
): MemoryRetrievalStats {
  const hitsById: Record<string, number> = {};
  const hitsByKey: Record<string, number> = {};
  const lastRetrievedAt: Record<string, string> = {};
  const now = new Date().toISOString();

  for (const row of hits) {
    hitsById[row.id] = (hitsById[row.id] ?? 0) + 1;
    hitsByKey[row.key] = (hitsByKey[row.key] ?? 0) + 1;
    lastRetrievedAt[row.id] = row.at ?? now;
  }

  return { hitsById, hitsByKey, lastRetrievedAt };
}

/** Turn access log from frame entities matching stored memory keys. */
export function buildTurnMemoryAccessLog(input: {
  memory: EventKernelMemoryState;
  frameEntities: readonly string[];
  now?: string;
}): MemoryAccessLogEntry[] {
  const at = input.now ?? new Date().toISOString();
  const out: MemoryAccessLogEntry[] = [];
  const entities = input.frameEntities.map((e) => e.trim()).filter(Boolean);
  if (entities.length === 0) {
    return out;
  }

  for (const item of [...input.memory.wm, ...input.memory.ltm]) {
    if (entities.some((entity) => memoryKeysMatch(entity, item.label))) {
      out.push({ memoryId: item.id, key: item.key, at });
    }
  }
  return out;
}
