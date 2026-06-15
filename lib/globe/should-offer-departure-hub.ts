import type { EventCandidate } from "@/lib/events/event-candidate";
import { readTripLegFromEvent } from "@/lib/globe/trip-leg-metadata";

const TRAVEL_SIGNAL =
  /(?:여행|출국|제주|오사카|해외|trip|flight|호텔|숙소|관광|vacation)/iu;
const AIRPORT_PLACE =
  /(?:공항|airport|\bICN\b|\bGMP\b|\bCJJ\b|\bPUS\b)/iu;

/** Ask to connect a departure hub when this context looks like a trip destination. */
export function shouldOfferDepartureHub(
  event: EventCandidate | null | undefined,
): boolean {
  if (!event) {
    return false;
  }

  const leg = readTripLegFromEvent(event);
  if (leg?.leg === "departure") {
    return false;
  }

  const place = event.place?.trim() ?? "";
  if (AIRPORT_PLACE.test(place)) {
    return false;
  }

  const blob = [event.title, place, event.category].filter(Boolean).join(" ");
  if (event.category === "travel") {
    return true;
  }
  if (event.metadata?.feedPlanEnabled === true) {
    return true;
  }
  return TRAVEL_SIGNAL.test(blob);
}
