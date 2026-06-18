import { recordOverlayActionTelemetry } from "@/lib/archive/record-action-telemetry";
import { syncLearningRollupFromTelemetry } from "@/lib/archive/sync-learning-rollup-from-telemetry";
import { buildArchiveContextKey } from "@/lib/archive/build-archived-event";
import type { ActionTelemetryKind } from "@/lib/archive/types";
import type { EventCandidate } from "@/lib/events/event-candidate";

const HUB_ACTION_ID = "context-hub-flight";

export function recordContextHubTelemetry(input: {
  event: EventCandidate;
  kind: ActionTelemetryKind;
  label?: string;
  at?: string;
}) {
  const label = input.label?.trim() || "항공 허브";
  recordOverlayActionTelemetry({
    eventId: input.event.id,
    action: {
      id: HUB_ACTION_ID,
      label,
      source: "projection",
      action_tier: "MAIN",
    },
    kind: input.kind,
    surface: "globe_hub",
    phase: buildArchiveContextKey(input.event),
    at: input.at,
  });
}

export function foldContextHubLearning(event: EventCandidate): void {
  syncLearningRollupFromTelemetry({
    telemetryEventId: event.id,
    contextKey: buildArchiveContextKey(event),
  });
}
