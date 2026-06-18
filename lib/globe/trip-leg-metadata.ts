import type { EventCandidate } from "@/lib/events/event-candidate";

export const TRIP_REF_META_KEY = "tripRef";
export const TRIP_LEG_META_KEY = "tripLeg";
export const LINKED_EVENT_ID_META_KEY = "linkedEventId";

export type TripLegKind = "departure" | "destination";

export type TripLegMeta = {
  tripRef: string;
  leg: TripLegKind;
  linkedEventId: string | null;
};

export function readTripLegFromEvent(
  event: EventCandidate | null | undefined,
): TripLegMeta | null {
  const meta = event?.metadata;
  if (!meta) {
    return null;
  }
  const tripRef =
    typeof meta[TRIP_REF_META_KEY] === "string" ? meta[TRIP_REF_META_KEY].trim() : "";
  const leg = meta[TRIP_LEG_META_KEY];
  if (!tripRef || (leg !== "departure" && leg !== "destination")) {
    return null;
  }
  const linkedEventId =
    typeof meta[LINKED_EVENT_ID_META_KEY] === "string"
      ? meta[LINKED_EVENT_ID_META_KEY].trim()
      : null;
  return { tripRef, leg, linkedEventId };
}

export function isOverseasTripLeg(event: EventCandidate | null | undefined): boolean {
  return readTripLegFromEvent(event) != null;
}
