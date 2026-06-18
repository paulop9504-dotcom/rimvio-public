import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { IntentRoute } from "@/lib/action-chat/intent-router";
import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";
import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import { buildLifeContextSnapshot } from "@/lib/event-horizon/build-life-context-snapshot";
import { tryEventHorizonProactiveResult } from "@/lib/event-horizon/orchestrate-proactive-nudge";
import { buildUserLocationWire } from "@/lib/global-brain/build-user-location-wire";
import { mapVitalityMatchToUserStatus } from "@/lib/global-brain/map-vitality-to-status";
import type { GlobalBrainSnapshot, UserStatusRecord } from "@/lib/global-brain/types";
import type { GlobalBrainWire } from "@/lib/global-brain/types";
import { classifyVitalityStateWithLlm } from "@/lib/vitality-state/classify-vitality-state-llm";
import { resolveTemporalExpression } from "@/lib/time/temporal-resolver";
import { parseScheduleListBatch } from "@/lib/schedule/parse-schedule-list-batch";
import { extractPreferenceFromMessage } from "@/lib/preference/preference-store";
import { extractNexusContactFromMessage } from "@/lib/nexus-db/contact-store";
import {
  evaluateActionEventRegistry,
  toActionEventWire,
} from "@/lib/action-event-registry/evaluate-lifecycle";
import { listActionEventRecords } from "@/lib/action-event-registry/action-event-store";
import { tryExtractActionEventFromMessage } from "@/lib/action-event-registry/extract-action-event-from-message";
import type { VitalityStateMatch } from "@/lib/vitality-state/vitality-state-types";
import type { TemporalResolution } from "@/lib/time/temporal-types";

/** Side effects gathered before Global Brain assembles the prompt block. */
export type TurnContextGatherResult = {
  snapshot: GlobalBrainSnapshot;
  vitalityMatch: VitalityStateMatch | null;
  statusPatch: UserStatusRecord | null;
  preferencePatch: { key: string; value: string; label: string } | null;
  nexusContactTouch: { name: string } | null;
  resolvedTemporal: TemporalResolution | null;
  proactiveResult: OrchestratorResult | null;
  actionEventUpsert: GlobalBrainWire["actionEventUpsert"];
};

function hasExplicitActionIntent(message: string): boolean {
  return /https?:\/\/|지도|맛집|길\s*찾|네비|검색|예약|일정\s*잡|전화(?:해|걸)|추천\s*해|찾아\s*줘|열어\s*줘|알려\s*줘/iu.test(
    message,
  );
}

function applyStatusPatchToSnapshot(input: {
  snapshot: GlobalBrainSnapshot;
  statusPatch: UserStatusRecord;
  rebuild: () => GlobalBrainSnapshot;
}): void {
  input.snapshot.userStatus = input.statusPatch;
  input.snapshot.recentStateMessages = [
    {
      flag: input.statusPatch.flag,
      label: input.statusPatch.label,
      updatedAt: input.statusPatch.updatedAt,
    },
    ...input.snapshot.recentStateMessages,
  ].slice(0, 5);
  input.snapshot.eventHorizon = input.rebuild().eventHorizon;
}

export async function gatherTurnContext(input: {
  message: string;
  masterContext?: MasterContextApiPayload | null;
  route: IntentRoute;
  context: MasterOrchestratorContext;
}): Promise<TurnContextGatherResult> {
  const recentStateMessages = (input.masterContext?.recentUserStatus ?? []).map((item) => ({
    flag: item.flag,
    label: item.label,
    updatedAt: item.updatedAt,
  }));

  const vitalityMatch = await classifyVitalityStateWithLlm(input.message);
  const resolvedTemporal = resolveTemporalExpression({
    message: input.message,
    referenceDate: input.context.currentDate,
  });
  const scheduleListBatch = parseScheduleListBatch(
    input.message,
    input.context.currentDate,
  );

  const registryRecords =
    input.masterContext?.actionEventRecords ?? listActionEventRecords();
  const evaluatedEvents = evaluateActionEventRegistry(registryRecords);
  const actionEvents = evaluatedEvents.map(toActionEventWire);

  const extractedEvent = tryExtractActionEventFromMessage({
    message: input.message,
    referenceDate: input.context.currentDate,
  });
  const actionEventUpsert = extractedEvent
    ? {
        task: extractedEvent.task,
        place_name: extractedEvent.placeName,
        target_time_iso: extractedEvent.targetTimeIso,
        kind: extractedEvent.kind,
        priority: extractedEvent.priority,
        source_message: extractedEvent.sourceMessage,
      }
    : null;

  const userLocation = buildUserLocationWire({
    locationMemory: input.masterContext?.locationMemory,
    message: input.message,
  });

  const snapshotBase = {
    referenceDate: input.context.currentDate,
    existingSchedule: input.context.existingSchedule,
    userGoals: input.masterContext?.userGoals,
    userStatus: input.masterContext?.userStatus ?? null,
    recentStateMessages,
    activitySources: input.masterContext?.activitySources,
    resolvedTemporal,
    userLocation,
    preferences: input.masterContext?.preferences ?? [],
    nexusContacts: input.masterContext?.nexusContacts ?? [],
    scheduleListBatch,
    actionEvents,
  };

  const snapshot = buildLifeContextSnapshot(snapshotBase);

  const statusPatch = vitalityMatch
    ? mapVitalityMatchToUserStatus(vitalityMatch, input.message)
    : null;

  if (statusPatch) {
    applyStatusPatchToSnapshot({
      snapshot,
      statusPatch,
      rebuild: () =>
        buildLifeContextSnapshot({
          ...snapshotBase,
          userStatus: statusPatch,
          recentStateMessages: snapshot.recentStateMessages,
        }),
    });
  }

  const preferencePatch = extractPreferenceFromMessage(input.message);
  const nexusDraft = extractNexusContactFromMessage(input.message);
  const nexusContactTouch = nexusDraft ? { name: nexusDraft.name } : null;

  const skipProactive =
    Boolean(vitalityMatch) ||
    Boolean(resolvedTemporal) ||
    Boolean(scheduleListBatch) ||
    hasExplicitActionIntent(input.message);

  const proactiveResult = tryEventHorizonProactiveResult({
    message: input.message,
    snapshot,
    skipWhenBusy: skipProactive,
  });

  return {
    snapshot,
    vitalityMatch,
    statusPatch,
    preferencePatch,
    nexusContactTouch,
    resolvedTemporal,
    proactiveResult,
    actionEventUpsert,
  };
}

/** Degraded gather when enrichment pipeline throws. */
export function gatherTurnContextDegraded(input: {
  message: string;
  masterContext?: MasterContextApiPayload | null;
  context: MasterOrchestratorContext;
}): TurnContextGatherResult {
  const resolvedTemporal = resolveTemporalExpression({
    message: input.message,
    referenceDate: input.context.currentDate,
  });
  const scheduleListBatch = parseScheduleListBatch(
    input.message,
    input.context.currentDate,
  );
  const snapshot = buildLifeContextSnapshot({
    referenceDate: input.context.currentDate,
    existingSchedule: input.context.existingSchedule,
    userGoals: input.masterContext?.userGoals,
    userStatus: input.masterContext?.userStatus ?? null,
    resolvedTemporal,
    scheduleListBatch,
  });

  return {
    snapshot,
    vitalityMatch: null,
    statusPatch: null,
    preferencePatch: null,
    nexusContactTouch: null,
    resolvedTemporal,
    proactiveResult: null,
    actionEventUpsert: null,
  };
}
