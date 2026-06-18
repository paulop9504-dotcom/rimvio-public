import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import { buildContextHubFlightBooking } from "@/lib/globe/context-hub/build-context-hub-flight-booking-url";
import {
  readContextHubIds,
  readContextHubKind,
  type ContextHubKind,
} from "@/lib/globe/context-hub/context-hub-metadata";
import {
  DEPARTURE_HUB_AIRPORT_IATA_META_KEY,
  findDepartureHubAirportByIata,
} from "@/lib/globe/departure-hub-airports";
import { isGlobeContextRemoved } from "@/lib/globe/delete-globe-context";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { readTripLegFromEvent } from "@/lib/globe/trip-leg-metadata";

export type ContextHubLink = {
  eventId: string;
  kind: ContextHubKind;
  label: string;
  shortLabel: string;
  airportIata: string | null;
  actionUrl: string | null;
  actionLabelKo: string | null;
  flightProvider?: "naver_flight" | "trip_com" | "google_flights" | null;
  flightRouteKind?: "domestic_kr" | "international" | null;
};

function projectHubLink(
  hubEvent: EventCandidate,
  contextEvent: EventCandidate,
): ContextHubLink | null {
  const kind = readContextHubKind(hubEvent);
  if (kind !== "departure_airport") {
    return null;
  }

  const iataRaw = hubEvent.metadata?.[DEPARTURE_HUB_AIRPORT_IATA_META_KEY];
  const iata = typeof iataRaw === "string" ? iataRaw.trim().toUpperCase() : "";
  const airport = iata ? findDepartureHubAirportByIata(iata) : null;
  const label =
    airport?.labelKo ??
    hubEvent.place?.trim() ??
    hubEvent.title.trim() ??
    "출발 허브";

  const destinationPlace =
    contextEvent.place?.trim() ||
    readPlanContextFromEvent(contextEvent)?.place?.trim() ||
    contextEvent.title.trim();
  const plan = readPlanContextFromEvent(contextEvent);
  const booking = airport
    ? buildContextHubFlightBooking({
        airport,
        destinationPlace,
        departDateIso: plan?.windowStartIso ?? contextEvent.datetime,
      })
    : null;

  return {
    eventId: hubEvent.id,
    kind,
    label,
    shortLabel: airport?.shortLabelKo ?? label,
    airportIata: airport?.iata ?? (iata || null),
    actionUrl: booking?.url ?? null,
    actionLabelKo: booking?.actionLabelKo ?? null,
    flightProvider: booking?.provider ?? null,
    flightRouteKind: booking?.routeKind ?? null,
  };
}

/** Hubs currently plugged into this context — includes legacy trip-leg links. */
export function listContextHubLinks(
  contextEvent: EventCandidate | null | undefined,
): ContextHubLink[] {
  if (!contextEvent) {
    return [];
  }

  const seen = new Set<string>();
  const links: ContextHubLink[] = [];

  const pushHub = (hubEventId: string) => {
    if (!hubEventId || seen.has(hubEventId)) {
      return;
    }
    seen.add(hubEventId);
    const hubEvent = findEventCandidate(hubEventId);
    if (!hubEvent || isGlobeContextRemoved(hubEvent)) {
      return;
    }
    const link = projectHubLink(hubEvent, contextEvent);
    if (link) {
      links.push(link);
    }
  };

  for (const hubEventId of readContextHubIds(contextEvent)) {
    pushHub(hubEventId);
  }

  const leg = readTripLegFromEvent(contextEvent);
  if (leg?.leg === "destination" && leg.linkedEventId) {
    pushHub(leg.linkedEventId);
  }

  return links;
}

export function findContextHubLinkByKind(
  contextEvent: EventCandidate | null | undefined,
  kind: ContextHubKind,
): ContextHubLink | null {
  return listContextHubLinks(contextEvent).find((row) => row.kind === kind) ?? null;
}
