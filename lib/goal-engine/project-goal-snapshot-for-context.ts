import type { GoalSnapshot } from "@/lib/goal-engine/types";

/** Read-only LLM projection — not writable; not a second source of truth. */
export type GoalSnapshotContextProjection = {
  primaryFocus: GoalSnapshot["primaryFocus"];
  weekFocusLabel: string | null;
  eventHorizonSummary: GoalSnapshot["eventHorizonSummary"] | null;
  sourceRevision: string;
  read_only: true;
};

export function projectGoalSnapshotForContext(
  snapshot: GoalSnapshot,
): GoalSnapshotContextProjection {
  return {
    primaryFocus: snapshot.primaryFocus,
    weekFocusLabel: snapshot.weekFocusLabel ?? null,
    eventHorizonSummary: snapshot.eventHorizonSummary ?? null,
    sourceRevision: snapshot.sourceRevision,
    read_only: true,
  };
}
