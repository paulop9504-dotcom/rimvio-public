import { findLearningRollupEntry } from "@/lib/archive/learning-rollup-store";

/** Minimum impressions before rollup shifts MAIN ranking (state inertia). */
export const ROLLUP_HYSTERESIS_MIN_SHOWN = 3;
/** scoreDelta must exceed this to promote above neutral weight. */
export const ROLLUP_HYSTERESIS_PROMOTE_DELTA = 0.06;
/** scoreDelta must fall below this to demote below neutral weight. */
export const ROLLUP_HYSTERESIS_DEMOTE_DELTA = -0.1;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

export function resolveRollupScoreDelta(input: {
  contextKey?: string;
  actionId: string;
  label: string;
}): number {
  if (!input.contextKey?.trim()) {
    return 0;
  }
  const entry =
    findLearningRollupEntry(input.contextKey, input.actionId) ??
    findLearningRollupEntry(input.contextKey, input.label.trim());
  return entry?.scoreDelta ?? 0;
}

/** Map archive rollup scoreDelta to 0–1 user-history weight for MAIN ranking. */
export function resolveRollupUserHistoryWeight(input: {
  contextKey?: string;
  actionId: string;
  label: string;
}): number {
  if (!input.contextKey?.trim()) {
    return 0.5;
  }

  const entry =
    findLearningRollupEntry(input.contextKey, input.actionId) ??
    findLearningRollupEntry(input.contextKey, input.label.trim());

  if (!entry || entry.shown < ROLLUP_HYSTERESIS_MIN_SHOWN) {
    return 0.5;
  }

  const delta = entry.scoreDelta;
  if (delta >= ROLLUP_HYSTERESIS_PROMOTE_DELTA) {
    return clamp01(0.5 + delta);
  }
  if (delta <= ROLLUP_HYSTERESIS_DEMOTE_DELTA) {
    return clamp01(0.5 + delta);
  }

  return 0.5;
}

