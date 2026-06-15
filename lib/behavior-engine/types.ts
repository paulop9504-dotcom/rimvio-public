import type { EventOpportunityPriority } from "@/lib/opportunity-engine/types";

export type BehaviorHighlightLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

/** Action policy for a ranked opportunity — no scoring, no mutation. */
export type EventBehaviorPolicy = {
  ecId: string;
  show_in_dock: boolean;
  highlight: BehaviorHighlightLevel;
  auto_nudge: boolean;
  notification: boolean;
  suppress: boolean;
};

export type BehaviorEngineContext = {
  /** ec-id currently focused in Dock / Timeline */
  focusedEcId?: string | null;
  /** ec-ids recently interacted with */
  recentEcIds?: readonly string[];
};

export type BehaviorEngineResult = EventBehaviorPolicy[] | "NO_ACTION";

/** Score band just above MEDIUM threshold — borderline opportunities. */
export const BORDERLINE_SCORE_MAX = 0.48;

const EC_PREFIX = /^ec-/u;

const HIGHLIGHT_RANK: Record<BehaviorHighlightLevel, number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

export function isValidBehaviorEcId(ecId: string): boolean {
  return EC_PREFIX.test(ecId.trim());
}

export function highlightFromRank(rank: number): BehaviorHighlightLevel {
  if (rank >= 3) {
    return "HIGH";
  }
  if (rank === 2) {
    return "MEDIUM";
  }
  if (rank === 1) {
    return "LOW";
  }
  return "NONE";
}

export function escalateHighlight(
  level: BehaviorHighlightLevel,
  steps = 1
): BehaviorHighlightLevel {
  return highlightFromRank(Math.min(3, HIGHLIGHT_RANK[level] + steps));
}

/** Time hints passthrough from Opportunity Engine reason text — not inference. */
export function isImminentFromReason(reason: string): boolean {
  return /\bimminent\b/u.test(reason);
}

export function isWithinTwoHoursFromReason(reason: string): boolean {
  return isImminentFromReason(reason) || /\bapproaching\b/u.test(reason);
}

export function baseHighlightForPriority(
  priority: EventOpportunityPriority
): BehaviorHighlightLevel {
  switch (priority) {
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
      return "MEDIUM";
    case "LOW":
      return "LOW";
    default:
      return "NONE";
  }
}

export function isBorderlineOpportunity(score: number, priority: EventOpportunityPriority): boolean {
  return priority === "MEDIUM" && score >= 0.42 && score <= BORDERLINE_SCORE_MAX;
}

export function isContextIrrelevant(
  ecId: string,
  priority: EventOpportunityPriority,
  context: BehaviorEngineContext
): boolean {
  if (priority !== "LOW") {
    return false;
  }
  const focused = context.focusedEcId?.trim();
  if (focused && focused === ecId) {
    return false;
  }
  return !(context.recentEcIds ?? []).includes(ecId);
}
