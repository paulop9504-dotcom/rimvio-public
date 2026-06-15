import { findLearningRollupEntry } from "@/lib/archive/learning-rollup-store";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function resolveRollupScoreDelta(input: {
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

  if (!entry) {
    return 0.5;
  }

  return clamp01(0.5 + entry.scoreDelta);
}

export { resolveRollupScoreDelta };
