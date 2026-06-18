import type { GlobalBrainSnapshot } from "@/lib/global-brain/types";
import type { GoalSnapshot } from "@/lib/goal-engine/types";
import { projectGoalSnapshotForContext } from "@/lib/goal-engine/project-goal-snapshot-for-context";
import { GLOBAL_BRAIN_PROTOCOL } from "@/lib/global-brain/global-brain-protocol";
import { buildCurrentSnapshotMarkdown } from "@/lib/global-brain/build-snapshot-markdown";
import { TEMPORAL_PARSING_PROTOCOL } from "@/lib/time/temporal-parsing-protocol";
import { TIME_NORMALIZATION_PROTOCOL } from "@/lib/time/normalize-time";
import { BATCH_PROCESSING_RULE } from "@/lib/schedule/batch-processing-protocol";
import { PREDICTIVE_DOCK_PROTOCOL } from "@/lib/predictive-dock/predictive-dock-protocol";
import { ACTION_ARCHITECT_PROTOCOL } from "@/lib/action-registry/action-architect-protocol";
import { RIMVIO_ACTION_OS_PROTOCOL } from "@/lib/action-os/rimvio-action-os-protocol";
import { buildActionDispatcherContextBlock } from "@/lib/action-dispatcher/rimvio-action-dispatcher-protocol";
import { buildAvailableTemplatesMarkdown } from "@/lib/action-registry/match-template";
import type { ActionRegistryEntry } from "@/lib/action-registry/types";

export function buildGlobalBrainContextBlock(input: {
  snapshot: GlobalBrainSnapshot;
  shouldEnrich: boolean;
  promotedTemplates?: ActionRegistryEntry[];
  /** §5 — pipeline-authored GoalSnapshot; read-only for LLM (never write back). */
  goalSnapshot?: GoalSnapshot | null;
  /** PRM export — AI-ready personal read frame (projection only). */
  personalReadBlock?: string | null;
}): string {
  if (!input.shouldEnrich) {
    const minimalMarkdown = buildCurrentSnapshotMarkdown(input.snapshot);
    return [
      GLOBAL_BRAIN_PROTOCOL,
      "",
      minimalMarkdown,
      "",
      "# [GLOBAL_BRAIN_SNAPSHOT — minimal]",
      JSON.stringify(
        {
          reference_date: input.snapshot.referenceDate,
          user_status: input.snapshot.userStatus?.flag ?? null,
        },
        null,
        2
      ),
    ].join("\n");
  }

  const payload = {
    reference_date: input.snapshot.referenceDate,
    current_datetime: input.snapshot.currentDateTime,
    today_schedule: input.snapshot.todaySchedule,
    remaining_schedule: input.snapshot.remainingSchedule,
    sentinel_tasks: input.snapshot.sentinelTasks,
    user_goals: input.snapshot.userGoals.slice(0, 5).map((goal) => ({
      title: goal.title,
      kind: goal.kind,
    })),
    user_status: input.snapshot.userStatus
      ? {
          flag: input.snapshot.userStatus.flag,
          label: input.snapshot.userStatus.label,
          vitality: input.snapshot.userStatus.vitality,
          since: input.snapshot.userStatus.updatedAt,
        }
      : null,
    recent_state_messages: input.snapshot.recentStateMessages.slice(0, 3),
    event_horizon: input.snapshot.eventHorizon,
    resolved_temporal: input.snapshot.resolvedTemporal
      ? {
          date_key: input.snapshot.resolvedTemporal.dateKey,
          iso: input.snapshot.resolvedTemporal.iso,
          display: input.snapshot.resolvedTemporal.displayLabel,
          raw_phrase: input.snapshot.resolvedTemporal.rawPhrase,
        }
      : null,
    user_location: input.snapshot.userLocation,
    preferences: input.snapshot.preferences,
    nexus_contacts: input.snapshot.nexusContacts,
    schedule_list_batch: input.snapshot.scheduleListBatch,
    action_events: input.snapshot.actionEvents,
    ...(input.goalSnapshot && input.goalSnapshot.primaryFocus !== "none"
      ? {
          goal_snapshot: projectGoalSnapshotForContext(input.goalSnapshot),
        }
      : {}),
  };

  const snapshotMarkdown = buildCurrentSnapshotMarkdown(input.snapshot);
  const templatesMarkdown = buildAvailableTemplatesMarkdown(input.promotedTemplates ?? []);
  const personalReadBlock = input.personalReadBlock?.trim() ?? null;

  return [
    GLOBAL_BRAIN_PROTOCOL,
    "",
    ACTION_ARCHITECT_PROTOCOL,
    "",
    RIMVIO_ACTION_OS_PROTOCOL,
    "",
    buildActionDispatcherContextBlock(),
    "",
    templatesMarkdown,
    "",
    snapshotMarkdown,
    "",
    TIME_NORMALIZATION_PROTOCOL,
    "",
    TEMPORAL_PARSING_PROTOCOL,
    "",
    BATCH_PROCESSING_RULE,
    "",
    PREDICTIVE_DOCK_PROTOCOL,
    "",
    ...(personalReadBlock ? [personalReadBlock, ""] : []),
    "# [GLOBAL_BRAIN_SNAPSHOT]",
    JSON.stringify(payload, null, 2),
    "",
    "Apply: Context Ingestion → Category → Event Horizon → Actionable UI JSON.",
  ].join("\n");
}
