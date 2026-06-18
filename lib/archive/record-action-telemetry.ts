import { appendActionTelemetry } from "@/lib/archive/action-telemetry-store";
import { syncLearningRollupFromTelemetry } from "@/lib/archive/sync-learning-rollup-from-telemetry";
import { buildArchiveContextKey } from "@/lib/archive/build-archived-event";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import type { ActionTelemetryKind } from "@/lib/archive/types";
import type { CalendarOverlayAction } from "@/lib/calendar/calendar-view-types";

export function recordOverlayActionTelemetry(input: {
  eventId: string;
  action: CalendarOverlayAction;
  kind: ActionTelemetryKind;
  surface?: string;
  phase?: string;
  at?: string;
}) {
  appendActionTelemetry({
    eventId: input.eventId,
    actionId: input.action.id,
    label: input.action.label,
    tier: input.action.action_tier ?? "AUX",
    kind: input.kind,
    phase: input.phase,
    surface: input.surface ?? "overlay",
    at: input.at,
  });
}

export function recordOverlayActionsShown(input: {
  eventId: string;
  actions: readonly CalendarOverlayAction[];
  surface?: string;
  phase?: string;
}) {
  for (const action of input.actions) {
    recordOverlayActionTelemetry({
      eventId: input.eventId,
      action,
      kind: "shown",
      surface: input.surface,
      phase: input.phase,
    });
  }
}

export function foldOverlayLearning(input: {
  eventId: string;
  contextKey: string;
}): void {
  syncLearningRollupFromTelemetry({
    telemetryEventId: input.eventId,
    contextKey: input.contextKey,
  });
}

export function foldOverlayLearningForEvent(eventId: string): void {
  const event = findLifeEventCandidate(eventId);
  if (!event) {
    return;
  }
  foldOverlayLearning({
    eventId,
    contextKey: buildArchiveContextKey(event),
  });
}
