import type { GoalSnapshot } from "@/lib/goal-engine/types";

export type GoalSnapshotValidationIssue = {
  field: string;
  message: string;
};

/** Assert §2.1 invariants — for tests and debug only. */
export function validateGoalSnapshot(snapshot: GoalSnapshot): GoalSnapshotValidationIssue[] {
  const issues: GoalSnapshotValidationIssue[] = [];

  if (!snapshot.referenceDate?.trim()) {
    issues.push({ field: "referenceDate", message: "required" });
  }

  if (snapshot.primaryFocus === undefined) {
    issues.push({ field: "primaryFocus", message: "required" });
  }

  if (snapshot.activeGoals.length > 3) {
    issues.push({ field: "activeGoals", message: "max 3 goals" });
  }

  for (const goal of snapshot.activeGoals) {
    if (goal.progress != null && (goal.progress < 0 || goal.progress > 100)) {
      issues.push({ field: `activeGoals.${goal.id}.progress`, message: "0–100" });
    }
  }

  const score = snapshot.productivityScore;
  if (score != null && (score < 0 || score > 100)) {
    issues.push({ field: "productivityScore", message: "0–100" });
  }

  if (!snapshot.sourceRevision?.trim()) {
    issues.push({ field: "sourceRevision", message: "required" });
  }

  return issues;
}

export function assertValidGoalSnapshot(snapshot: GoalSnapshot): void {
  const issues = validateGoalSnapshot(snapshot);
  if (issues.length > 0) {
    throw new Error(
      `Invalid GoalSnapshot: ${issues.map((item) => `${item.field}: ${item.message}`).join(", ")}`,
    );
  }
}
