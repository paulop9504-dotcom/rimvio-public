import { buildTieredEventOverlayActions } from "@/lib/action-decision/build-tiered-event-overlay-actions";
import type { CalendarOverlayAction } from "@/lib/calendar/calendar-view-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ActionTelemetryEvent,
  ArchivedActionRecord,
  ArchivedActionResult,
  ArchivedBehaviorSnapshot,
  ArchivedEvent,
  ArchivedExecutionSummary,
  LearningSignal,
} from "@/lib/archive/types";

function sourceRefOf(event: EventCandidate): string {
  const raw = event.metadata?.sourceRef;
  return typeof raw === "string" && raw.trim() ? raw.trim() : event.source;
}

export function buildArchiveContextKey(event: EventCandidate): string {
  return `event.${event.category}.${sourceRefOf(event)}`;
}

function deriveOverlayActionsAtFold(event: EventCandidate): CalendarOverlayAction[] {
  const startAt = event.datetime ?? event.createdAt;
  const startMs = new Date(startAt).getTime();
  if (Number.isNaN(startMs)) {
    return [];
  }
  return buildTieredEventOverlayActions({
    ecId: event.id,
    title: event.title,
    startAt,
    startMs,
  });
}

function resolveActionResult(record: {
  shownAt?: string;
  clickedAt?: string;
  executedAt?: string;
  dismissedAt?: string;
}): ArchivedActionResult {
  if (record.executedAt) {
    return "executed";
  }
  if (record.dismissedAt) {
    return "dismissed";
  }
  if (record.clickedAt) {
    return "clicked";
  }
  if (record.shownAt) {
    return "ignored";
  }
  return "ignored";
}

function mergeActionRecord(
  action: CalendarOverlayAction,
  telemetry: readonly ActionTelemetryEvent[],
): ArchivedActionRecord {
  const entries = telemetry.filter((entry) => entry.actionId === action.id);
  const shownAt = entries.find((entry) => entry.kind === "shown")?.at;
  const clickedAt = entries.find((entry) => entry.kind === "clicked")?.at;
  const executedAt = entries.find((entry) => entry.kind === "executed")?.at;
  const dismissedAt = entries.find((entry) => entry.kind === "dismissed")?.at;
  const phase = entries.find((entry) => entry.phase)?.phase;

  const record = { shownAt, clickedAt, executedAt, dismissedAt };
  return {
    actionId: action.id,
    label: action.label,
    tier: action.action_tier ?? "AUX",
    phase,
    ...record,
    result: resolveActionResult(record),
  };
}

function mergeTelemetryOnlyActionRecord(
  actionId: string,
  telemetry: readonly ActionTelemetryEvent[],
): ArchivedActionRecord {
  const entries = telemetry.filter((entry) => entry.actionId === actionId);
  const first = entries[0]!;
  const shownAt = entries.find((entry) => entry.kind === "shown")?.at;
  const clickedAt = entries.find((entry) => entry.kind === "clicked")?.at;
  const executedAt = entries.find((entry) => entry.kind === "executed")?.at;
  const dismissedAt = entries.find((entry) => entry.kind === "dismissed")?.at;
  const phase = entries.find((entry) => entry.phase)?.phase;
  const record = { shownAt, clickedAt, executedAt, dismissedAt };

  return {
    actionId,
    label: first.label,
    tier: first.tier,
    phase,
    ...record,
    result: resolveActionResult(record),
  };
}

function buildExecutionSummary(
  records: readonly ArchivedActionRecord[],
): ArchivedExecutionSummary {
  return {
    shownCount: records.filter((record) => record.shownAt).length,
    clickedCount: records.filter((record) => record.clickedAt).length,
    executedCount: records.filter((record) => record.executedAt).length,
    dismissedCount: records.filter((record) => record.dismissedAt).length,
    ignoredCount: records.filter((record) => record.result === "ignored").length,
  };
}

function buildBehaviorSnapshot(
  contextKey: string,
  records: readonly ArchivedActionRecord[],
): ArchivedBehaviorSnapshot {
  const mainRecords = records.filter((record) => record.tier === "MAIN");
  const auxRecords = records.filter((record) => record.tier === "AUX");
  const selectedMain =
    mainRecords.find((record) => record.result === "executed" || record.result === "clicked")
      ?.actionId ??
    mainRecords.find((record) => record.shownAt)?.actionId ??
    null;

  const selectedAuxActions = auxRecords
    .filter((record) => record.result === "executed" || record.result === "clicked")
    .map((record) => record.actionId);

  const ignoredActions = records
    .filter((record) => record.result === "ignored")
    .map((record) => record.actionId);

  return {
    contextKey,
    selectedMainAction: selectedMain,
    selectedAuxActions,
    ignoredActions,
  };
}

function clampRate(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function buildLearningSignals(
  contextKey: string,
  records: readonly ArchivedActionRecord[],
): LearningSignal[] {
  return records.map((record) => {
    const shown = record.shownAt ? 1 : 0;
    const clicked = record.clickedAt ? 1 : 0;
    const executed = record.executedAt ? 1 : 0;
    const dismissed = record.dismissedAt ? 1 : 0;
    const rates = {
      clickRate: shown > 0 ? clampRate(clicked / shown) : 0,
      executeRate: shown > 0 ? clampRate(executed / shown) : 0,
      dismissRate: shown > 0 ? clampRate(dismissed / shown) : 0,
    };
    return {
      contextKey,
      actionKey: record.actionId,
      label: record.label,
      shown,
      clicked,
      executed,
      dismissed,
      rates,
      scoreDelta: clampRate(rates.executeRate * 0.6 + rates.clickRate * 0.25 - rates.dismissRate * 0.5),
    };
  });
}

/** Pure fold — EventCandidate + telemetry → ArchivedEvent (no store writes). */
export function buildArchivedEvent(input: {
  event: EventCandidate;
  telemetry: readonly ActionTelemetryEvent[];
  archivedAt: string;
  archiveId: string;
}): ArchivedEvent {
  const { event, telemetry, archivedAt, archiveId } = input;
  const contextKey = buildArchiveContextKey(event);
  const overlayActions = deriveOverlayActionsAtFold(event);
  const actionRecords = overlayActions.map((action) => mergeActionRecord(action, telemetry));
  const knownActionIds = new Set(actionRecords.map((record) => record.actionId));
  for (const actionId of new Set(telemetry.map((entry) => entry.actionId))) {
    if (!knownActionIds.has(actionId)) {
      actionRecords.push(mergeTelemetryOnlyActionRecord(actionId, telemetry));
    }
  }
  const mainActionHistory = actionRecords.filter((record) => record.tier === "MAIN");
  const auxiliaryActionHistory = actionRecords.filter((record) => record.tier !== "MAIN");

  return {
    archiveId,
    archivedAt,
    event: {
      eventId: event.id,
      title: event.title,
      startTime: event.datetime,
      endTime: undefined,
      location: event.place,
      status: event.lifecycle,
      sourceRef: sourceRefOf(event),
      category: event.category,
    },
    mainActionHistory,
    auxiliaryActionHistory,
    executionSummary: buildExecutionSummary(actionRecords),
    behaviorSnapshot: buildBehaviorSnapshot(contextKey, actionRecords),
    learningSignals: buildLearningSignals(contextKey, actionRecords),
  };
}
