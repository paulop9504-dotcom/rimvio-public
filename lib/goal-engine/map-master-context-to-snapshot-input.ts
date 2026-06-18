import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";
import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import type { GoalSnapshotBuildInput } from "@/lib/goal-engine/types";

/**
 * Maps orchestrator master context → GoalSnapshotBuildInput (pipeline-only).
 * Ignores `masterContext.goalSnapshotRevision` — §6 client echo must not trigger rebuild.
 */
export function mapMasterContextToSnapshotInput(input: {  context: MasterOrchestratorContext;
  masterContext?: MasterContextApiPayload | null;
}): GoalSnapshotBuildInput {
  const payload = input.masterContext;
  return {
    referenceDate: input.context.currentDate,
    existingSchedule: input.context.existingSchedule,
    userGoals: payload?.userGoals,
    activitySources: payload?.activitySources,
    userStatus: payload?.userStatus ?? null,
    recentUserStatus: payload?.recentUserStatus,
    reminders: payload?.allReminders,
  };
}
