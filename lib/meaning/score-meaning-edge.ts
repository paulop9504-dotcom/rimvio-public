import {
  MEANING_RECENCY_HALF_LIFE_DAYS,
  type MeaningScore,
} from "@/lib/meaning/meaning-types";

export type MeaningEdgeAccumulator = {
  eventIds: Set<string>;
  lastAtMs: number;
  totalDwellMinutes: number;
  verifyCount: number;
  coPresenceHits: number;
};

export function createMeaningEdgeAccumulator(): MeaningEdgeAccumulator {
  return {
    eventIds: new Set(),
    lastAtMs: 0,
    totalDwellMinutes: 0,
    verifyCount: 0,
    coPresenceHits: 0,
  };
}

function recencyScore(lastAtMs: number, nowMs: number): number {
  if (lastAtMs <= 0) {
    return 0;
  }
  const days = Math.max(0, (nowMs - lastAtMs) / (1000 * 60 * 60 * 24));
  const decay = Math.pow(0.5, days / MEANING_RECENCY_HALF_LIFE_DAYS);
  return Math.round(decay * 100);
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Composite edge score from accumulated observations. */
export function scoreMeaningEdge(
  acc: MeaningEdgeAccumulator,
  nowMs = Date.now(),
): MeaningScore {
  const frequency = acc.eventIds.size;
  const recency = recencyScore(acc.lastAtMs, nowMs);
  const duration = clampScore(acc.totalDwellMinutes / 6);
  const coPresence = clampScore(acc.coPresenceHits * 25);
  const verifyCount = acc.verifyCount;

  const verifyComponent = clampScore(verifyCount * 15);
  const frequencyComponent = clampScore(frequency * 20);

  const total = clampScore(
    frequencyComponent * 0.3 +
      recency * 0.2 +
      duration * 0.15 +
      coPresence * 0.2 +
      verifyComponent * 0.15,
  );

  return {
    total,
    frequency,
    recency,
    duration,
    coPresence,
    verifyCount,
  };
}
