import type { GoalSnapshot } from "@/lib/goal-engine/types";
import { serializeGoalSnapshotWire } from "@/lib/goal-engine/serialize-goal-snapshot-wire";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

export function stampGoalEngineMetadata(
  result: OrchestratorResult,
  snapshot: GoalSnapshot | null,
): OrchestratorResult {
  if (!snapshot) {
    return result;
  }

  return {
    ...result,
    goalSnapshot: serializeGoalSnapshotWire(snapshot),
    metadata: {
      ...result.metadata,
      intent: result.metadata?.intent ?? "ACTION",
      trust_level_adjustment: result.metadata?.trust_level_adjustment ?? "NONE",
      goal_primary_focus: snapshot.primaryFocus,
      goal_snapshot_revision: snapshot.sourceRevision,
    },
  };
}
