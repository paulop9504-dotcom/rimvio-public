import type { GoalConstraint, GoalSnapshot } from "@/lib/goal-engine/types";

export function hasGoalConstraint(snapshot: GoalSnapshot, kind: string): boolean {
  return snapshot.constraints?.some((item) => item.kind === kind) ?? false;
}

export function listGoalConstraintKinds(snapshot: GoalSnapshot): string[] {
  return (snapshot.constraints ?? []).map((item) => item.kind);
}

export function findGoalConstraint(
  snapshot: GoalSnapshot,
  kind: string,
): GoalConstraint | undefined {
  return snapshot.constraints?.find((item) => item.kind === kind);
}
