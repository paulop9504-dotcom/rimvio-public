import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildPlacePrefillPlan } from "@/lib/globe/place-history/build-place-prefill-plan";
import {
  PLACE_PREFILL_STATE_META_KEY,
  type PlacePrefillState,
} from "@/lib/globe/place-history/place-prefill-types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function readState(metadata: Record<string, unknown> | undefined): PlacePrefillState {
  const raw = metadata?.[PLACE_PREFILL_STATE_META_KEY];
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const row = raw as Record<string, unknown>;
  return {
    dismissedAtIso:
      typeof row.dismissedAtIso === "string" ? row.dismissedAtIso : null,
    appliedAtIso: typeof row.appliedAtIso === "string" ? row.appliedAtIso : null,
    lastPlanPlaceKey:
      typeof row.lastPlanPlaceKey === "string" ? row.lastPlanPlaceKey : null,
  };
}

export function readPlacePrefillState(event: EventCandidate): PlacePrefillState {
  return readState(event.metadata);
}

export function shouldOfferPlacePrefill(
  event: EventCandidate | null | undefined,
  now = new Date(),
): boolean {
  if (!event) {
    return false;
  }
  if (event.category !== "travel" && event.metadata?.feedPlanEnabled !== true) {
    return false;
  }
  const lifecycle = event.lifecycle;
  if (lifecycle !== "planned" && lifecycle !== "confirmed" && lifecycle !== "scheduled") {
    return false;
  }

  const plan = readPlanContextFromEvent(event);
  const startMs = Date.parse(plan?.windowStartIso ?? event.datetime ?? "");
  if (!Number.isNaN(startMs) && startMs - now.getTime() < -7 * 24 * 60 * 60 * 1000) {
    return false;
  }

  const state = readPlacePrefillState(event);
  if (state.dismissedAtIso || state.appliedAtIso) {
    return false;
  }

  return buildPlacePrefillPlan(event) != null;
}
