import type { GoalPriorityHint, GoalSnapshot } from "@/lib/goal-engine/types";

export function createFallbackGoalSnapshot(referenceDate: string): GoalSnapshot {
  return {
    referenceDate,
    activeGoals: [],
    primaryFocus: "none",
    sourceRevision: "fallback",
  };
}

export function createFallbackGoalPriorityHint(): GoalPriorityHint {
  return {};
}
