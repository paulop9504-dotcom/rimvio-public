import type { GoalSnapshot } from "@/lib/goal-engine/types";

/**
 * §6 — API/client wire shape. Read-only derived view; never `editable` or writable flags.
 * Full snapshot is authored once per turn on the server; clients consume, not rebuild.
 */
export type GoalSnapshotWire = {
  referenceDate: string;
  activeGoals: GoalSnapshot["activeGoals"];
  primaryFocus: GoalSnapshot["primaryFocus"];
  weekFocusLabel?: string;
  eventHorizonSummary?: GoalSnapshot["eventHorizonSummary"];
  vitalityHint?: string;
  productivityScore?: number;
  constraints?: GoalSnapshot["constraints"];
  sourceRevision: string;
  snapshotExpiresAt?: string;
  read_only: true;
};

export function serializeGoalSnapshotWire(
  snapshot: GoalSnapshot,
): GoalSnapshotWire {
  return {
    referenceDate: snapshot.referenceDate,
    activeGoals: snapshot.activeGoals.map((goal) => ({ ...goal })),
    primaryFocus: snapshot.primaryFocus,
    weekFocusLabel: snapshot.weekFocusLabel,
    eventHorizonSummary: snapshot.eventHorizonSummary
      ? { ...snapshot.eventHorizonSummary }
      : undefined,
    vitalityHint: snapshot.vitalityHint,
    productivityScore: snapshot.productivityScore,
    constraints: snapshot.constraints?.map((item) => ({ ...item })),
    sourceRevision: snapshot.sourceRevision,
    snapshotExpiresAt: snapshot.snapshotExpiresAt,
    read_only: true,
  };
}
