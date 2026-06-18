import type { EventCandidate } from "@/lib/events/event-candidate";
import { findContextHubLinkByKind } from "@/lib/globe/context-hub/list-context-hub-links";
import { shouldOfferDepartureHub } from "@/lib/globe/should-offer-departure-hub";
import { suggestDepartureHubOptions } from "@/lib/globe/suggest-departure-hub-options";

/** Map pin tap rhythm — hub offer → replay on map → bridge sheet. */
export type ContextMapTapPhase = "hub_offer" | "awaiting_replay" | "media_open";

export function shouldShowContextHubOffer(
  event: EventCandidate | null | undefined,
): boolean {
  if (!event || !shouldOfferDepartureHub(event)) {
    return false;
  }
  if (findContextHubLinkByKind(event, "departure_airport")) {
    return false;
  }
  const place = event.place?.trim() || event.title.trim();
  return suggestDepartureHubOptions({ destinationPlace: place }).length > 0;
}

export function resolveInitialContextMapTapPhase(
  event: EventCandidate | null | undefined,
): ContextMapTapPhase {
  return shouldShowContextHubOffer(event) ? "hub_offer" : "awaiting_replay";
}

export function contextMapTapPhaseAllowsMediaReplay(
  phase: ContextMapTapPhase,
): boolean {
  return phase === "media_open";
}
