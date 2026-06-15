/**
 * Tunable constants — validated against rule/ability scale in score-guardrails.ts.
 *
 * Scale reference (existing pipeline):
 * - RuleBoost peaks: ~200 (kakaomap installed), ~100 (commute map)
 * - AbilityPenalty: 1–99 (copy = 99)
 * - IntentBinBoost: ~±40 max
 *
 * Personal + State caps are intentionally << RuleBoost to avoid overriding
 * hard domain rules (map during commute, etc.).
 */
export const RECENCY_LAMBDA = 0.35;

/** Max Motivation boost from recent-click profile. */
export const PERSONAL_MAX = 25;

/** Max Motivation boost from link lifecycle state transition. */
export const STATE_MAX = 30;

/** Minimum recent clicks before personal boost activates (cold start). */
export const MIN_CLICKS_FOR_PERSONAL = 3;

/** Personal boost cannot exceed this fraction of the leading rule score. */
export const MAX_PERSONAL_SHARE_OF_RULE = 0.25;

/** New primary must beat rule-winner by this margin to swap (anti-flicker). */
export const PRIMARY_SWAP_MARGIN = 8;

/** Incumbent primary (session or user tap) must be beaten by this margin to swap. */
export const PRIMARY_HYSTERESIS_MARGIN = 12;

/** Max combined personal + state boost as fraction of rule score. */
export const MAX_COMBINED_PERSONAL_STATE_SHARE = 0.35;

/** Action families excluded from personal Motivation (spam / low intent). */
export const BLOCKED_PERSONAL_FAMILIES = new Set(["copy_clip"]);

/** Hours after save before revisit transition boosts compare/purchase. */
export const REVISIT_HOURS_THRESHOLD = 20;

/** Recency weight at index i (0 = most recent). */
export function recencyWeight(index: number): number {
  return Math.exp(-RECENCY_LAMBDA * Math.max(0, index));
}

/** Recompute weights for a recent-click array (client-side mirror of SQL RPC). */
export function applyRecencyWeights<T extends { weight?: number }>(
  clicks: T[]
): Array<T & { weight: number }> {
  return clicks.slice(0, 10).map((entry, index) => ({
    ...entry,
    weight: Number(recencyWeight(index).toFixed(4)),
  }));
}
