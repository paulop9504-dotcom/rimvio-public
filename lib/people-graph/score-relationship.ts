import type { RelationshipScore } from "@/lib/people-graph/person-types";
import { MEANING_RECENCY_HALF_LIFE_DAYS } from "@/lib/meaning/meaning-types";

export type RelationshipScoreInput = {
  coExperienceCount: number;
  sharedThreadCount: number;
  lastAtMs: number;
  verifyCount: number;
  hasDirectThread: boolean;
  nowMs?: number;
};

function recencyComponent(lastAtMs: number, nowMs: number): number {
  if (lastAtMs <= 0) {
    return 0;
  }
  const days = Math.max(0, (nowMs - lastAtMs) / (1000 * 60 * 60 * 24));
  return Math.round(Math.pow(0.5, days / MEANING_RECENCY_HALF_LIFE_DAYS) * 100);
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function scoreRelationship(input: RelationshipScoreInput): RelationshipScore {
  const nowMs = input.nowMs ?? Date.now();
  const recency = recencyComponent(input.lastAtMs, nowMs);
  const experienceComponent = clamp(input.coExperienceCount * 18);
  const threadComponent = clamp(input.sharedThreadCount * 22);
  const verifyComponent = clamp(input.verifyCount * 12);
  const directThreadBoost = input.hasDirectThread ? 15 : 0;

  const total = clamp(
    experienceComponent * 0.35 +
      threadComponent * 0.2 +
      recency * 0.2 +
      verifyComponent * 0.15 +
      directThreadBoost,
  );

  return {
    total,
    coExperienceCount: input.coExperienceCount,
    sharedThreadCount: input.sharedThreadCount,
    recency,
    verifyCount: input.verifyCount,
    hasDirectThread: input.hasDirectThread,
  };
}
