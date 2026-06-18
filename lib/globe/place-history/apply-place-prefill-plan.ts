import type { EventCandidate } from "@/lib/events/event-candidate";
import { enableLodgingHubForContext } from "@/lib/globe/context-hub/enable-lodging-hub-for-context";
import { recordPlaceHubLearning } from "@/lib/globe/place-history/record-place-hub-learning";
import type { PlacePrefillPlan } from "@/lib/globe/place-history/place-prefill-types";
import { PLACE_PREFILL_STATE_META_KEY } from "@/lib/globe/place-history/place-prefill-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type ApplyPlacePrefillResult = {
  event: EventCandidate;
  appliedHubs: string[];
};

export async function applyPlacePrefillPlan(input: {
  event: EventCandidate;
  plan: PlacePrefillPlan;
  lat?: number | null;
  lng?: number | null;
}): Promise<ApplyPlacePrefillResult> {
  let event = input.event;
  const appliedHubs: string[] = [];

  for (const hub of input.plan.hubs) {
    if (hub.hubId === "lodging") {
      event = await enableLodgingHubForContext({
        contextEventId: event.id,
        lat: input.lat,
        lng: input.lng,
      });
      appliedHubs.push("lodging");
      recordPlaceHubLearning({ event, hubId: "lodging", kind: "executed" });
    }
  }

  const stamp = new Date().toISOString();
  event = commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    metadata: {
      ...(event.metadata ?? {}),
      [PLACE_PREFILL_STATE_META_KEY]: {
        appliedAtIso: stamp,
        lastPlanPlaceKey: input.plan.placeKey,
      },
    },
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });

  return { event, appliedHubs };
}

export function dismissPlacePrefill(input: {
  event: EventCandidate;
  placeKey: string;
}): EventCandidate {
  const stamp = new Date().toISOString();
  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.lifecycle,
    datetime: input.datetime,
    place: input.place,
    description: input.description,
    metadata: {
      ...(input.event.metadata ?? {}),
      [PLACE_PREFILL_STATE_META_KEY]: {
        dismissedAtIso: stamp,
        lastPlanPlaceKey: input.placeKey,
      },
    },
    confidence: input.event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
  });
}
