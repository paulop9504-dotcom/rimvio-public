import { applyLearningSignals } from "@/lib/archive/learning-rollup-store";
import type { ActionTelemetryKind } from "@/lib/archive/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildPlaceScopedLearningContextKey } from "@/lib/globe/passive-context/build-place-scoped-learning-key";
import type { PlacePrefillHubId } from "@/lib/globe/place-history/place-prefill-types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const HUB_LABEL_KO: Record<PlacePrefillHubId, string> = {
  lodging: "숙소",
  flight: "항공",
  ticket: "티켓",
};

function resolvePlaceLabel(event: EventCandidate): string | null {
  const plan = readPlanContextFromEvent(event);
  return plan?.place?.trim() || event.place?.trim() || null;
}

/** Cross-trip place rollup — hub connect / verify success. */
export function recordPlaceHubLearning(input: {
  event: EventCandidate;
  hubId: PlacePrefillHubId;
  kind: Extract<ActionTelemetryKind, "executed" | "clicked" | "dismissed">;
}) {
  const place = resolvePlaceLabel(input.event);
  const contextKey = buildPlaceScopedLearningContextKey(place);
  if (!contextKey) {
    return;
  }

  const shown = input.kind === "executed" || input.kind === "clicked" ? 1 : 0;
  const clicked = input.kind === "clicked" || input.kind === "executed" ? 1 : 0;
  const executed = input.kind === "executed" ? 1 : 0;
  const dismissed = input.kind === "dismissed" ? 1 : 0;

  applyLearningSignals([
    {
      contextKey,
      actionKey: `hub:${input.hubId}`,
      label: HUB_LABEL_KO[input.hubId],
      shown,
      clicked,
      executed,
      dismissed,
      rates: {
        clickRate: shown > 0 ? clicked / shown : 0,
        executeRate: shown > 0 ? executed / shown : 0,
        dismissRate: shown > 0 ? dismissed / shown : 0,
      },
      scoreDelta: 0,
    },
  ]);
}

export function recordPlaceResourceOpenLearning(input: {
  event: EventCandidate;
  resourceLabel: string;
}) {
  const place = resolvePlaceLabel(input.event);
  const contextKey = buildPlaceScopedLearningContextKey(place);
  const label = input.resourceLabel.trim();
  if (!contextKey || !label) {
    return;
  }

  applyLearningSignals([
    {
      contextKey,
      actionKey: `resource:${label.slice(0, 48)}`,
      label,
      shown: 1,
      clicked: 1,
      executed: 0,
      dismissed: 0,
      rates: { clickRate: 1, executeRate: 0, dismissRate: 0 },
      scoreDelta: 0,
    },
  ]);
}
