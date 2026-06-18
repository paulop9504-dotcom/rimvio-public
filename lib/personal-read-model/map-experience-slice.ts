import type { EventCandidate } from "@/lib/events/event-candidate";
import { GLOBE_CONTEXT_VISIBILITY_EXTERNAL } from "@/lib/globe/globe-context-visibility";
import { listContextHubLinks } from "@/lib/globe/context-hub/list-context-hub-links";
import { readContextHubIds } from "@/lib/globe/context-hub/context-hub-metadata";
import { DEPARTURE_HUB_AIRPORT_IATA_META_KEY } from "@/lib/globe/departure-hub-airports";
import { findEventCandidate } from "@/lib/events/event-store";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { readTripLegFromEvent } from "@/lib/globe/trip-leg-metadata";
import type { SurfaceReadBundle } from "@/lib/life-read-model/types";
import type { PersonalReadExperienceSlice } from "@/lib/personal-read-model/types";

function readFocusVisibility(
  event: EventCandidate | null,
): "private" | "external" | null {
  if (!event) {
    return null;
  }
  return event.metadata?.globeContextVisibility === GLOBE_CONTEXT_VISIBILITY_EXTERNAL
    ? "external"
    : "private";
}

function resolveDepartureHubIata(focusEvent: EventCandidate | null): string | null {
  if (!focusEvent) {
    return null;
  }
  for (const hubId of readContextHubIds(focusEvent)) {
    const hubEvent = findEventCandidate(hubId);
    const iata = hubEvent?.metadata?.[DEPARTURE_HUB_AIRPORT_IATA_META_KEY];
    if (typeof iata === "string" && iata.trim()) {
      return iata.trim().toUpperCase();
    }
  }
  return null;
}

export function mapExperienceSlice(input: {
  focusEvent: EventCandidate | null;
  surface: SurfaceReadBundle;
}): PersonalReadExperienceSlice {
  const { focusEvent, surface } = input;
  const tripLeg = readTripLegFromEvent(focusEvent);
  const pin = focusEvent ? findPersonalGlobePinByEventId(focusEvent.id) : null;
  const hubLinks = focusEvent ? listContextHubLinks(focusEvent) : [];

  const focusedNarration =
    focusEvent &&
    surface.narrations.find((row) => row.ecId === focusEvent.id)?.explanation;

  const narrationHeadline =
    focusedNarration ??
    surface.narrations[0]?.explanation ??
    null;

  return {
    focus: {
      eventId: focusEvent?.id ?? null,
      title: focusEvent?.title?.trim() ?? null,
      place: focusEvent?.place?.trim() ?? pin?.placeLabel?.trim() ?? null,
      category: focusEvent?.category ?? null,
      visibility: readFocusVisibility(focusEvent),
    },
    spatial: {
      pinIds: pin ? [pin.id] : [],
      tripLegId: tripLeg?.tripRef ?? null,
      departureHubIata: resolveDepartureHubIata(focusEvent),
    },
    narrationHeadline,
    hubLinks: hubLinks.map((row) => ({
      kind: row.kind,
      label: row.label,
      actionUrl: row.actionUrl,
      flightProvider: row.flightProvider ?? null,
    })),
  };
}

export function resolveActiveHubKinds(focusEvent: EventCandidate | null): string[] {
  if (!focusEvent) {
    return [];
  }
  return [...new Set(listContextHubLinks(focusEvent).map((row) => row.kind))];
}
