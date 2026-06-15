import type { EventCandidate } from "@/lib/events/event-candidate";
import { shouldOfferDepartureHub } from "@/lib/globe/should-offer-departure-hub";

/** Whether this context (or draft fields) can accept plug-in resource hubs. */
export function shouldSuggestContextHubs(
  event: EventCandidate | null | undefined,
): boolean {
  return shouldOfferDepartureHub(event);
}

/** Pre-create draft — title + place before the event exists. */
export function shouldSuggestContextHubsForDraft(input: {
  title?: string | null;
  place?: string | null;
}): boolean {
  const title = input.title?.trim() ?? "";
  const place = input.place?.trim() ?? "";
  if (!title && !place) {
    return false;
  }

  return shouldOfferDepartureHub({
    id: "draft:context-hub",
    title,
    place,
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    confidence: 0.5,
    metadata: { feedPlanEnabled: true, globeManualContext: true },
  });
}
