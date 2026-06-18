import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { resolveContextPlaceLabel } from "@/lib/globe/context-hub/resolve-context-place-label";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const NEAR_DESTINATION_KM = 25;

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isTravelLikeContext(event: EventCandidate): boolean {
  if (event.category === "travel") {
    return true;
  }
  const plan = readPlanContextFromEvent(event);
  if (plan?.place?.trim()) {
    return true;
  }
  return event.metadata?.feedPlanEnabled === true;
}

/** Destination anchor for lodging — context pin / place geocode, not viewer GPS. */
export function resolveContextLodgingDestinationAnchor(
  event: EventCandidate,
): { lat: number; lng: number } {
  const meta = event.metadata ?? {};
  const confirmedLat = readFiniteCoord(meta.globePlaceLat);
  const confirmedLng = readFiniteCoord(meta.globePlaceLng);

  if (
    meta.globePlaceConfirmed === true &&
    confirmedLat != null &&
    confirmedLng != null
  ) {
    return { lat: confirmedLat, lng: confirmedLng };
  }

  const pin = findPersonalGlobePinByEventId(event.id);
  if (pin && Number.isFinite(pin.lat) && Number.isFinite(pin.lng)) {
    return { lat: pin.lat, lng: pin.lng };
  }

  if (confirmedLat != null && confirmedLng != null) {
    return { lat: confirmedLat, lng: confirmedLng };
  }

  const placeLabel = resolveContextPlaceLabel(event);
  const overseas = classifyOverseasManualPlace(placeLabel);
  if (overseas) {
    return { lat: overseas.lat, lng: overseas.lng };
  }

  if (isTravelLikeContext(event)) {
    const geocoded = resolvePlaceCoordinates(placeLabel);
    return { lat: geocoded.lat, lng: geocoded.lng };
  }

  const coords = resolveEventGlobeCoords(event);
  return { lat: coords.lat, lng: coords.lng };
}

export function shouldPreferUserLocationForLodgingSync(input: {
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
}): boolean {
  const userLat = input.lat ?? null;
  const userLng = input.lng ?? null;
  if (userLat == null || userLng == null) {
    return false;
  }
  const destination = resolveContextLodgingDestinationAnchor(input.event);
  return haversineKm(userLat, userLng, destination.lat, destination.lng) <= NEAR_DESTINATION_KM;
}

/** Context anchor for lodging Nearby Search — destination first; GPS only when near place. */
export function resolveContextLodgingSearchCoords(
  event: EventCandidate,
  input?: {
    lat?: number | null;
    lng?: number | null;
    preferUserLocation?: boolean;
  },
): { lat: number; lng: number } | null {
  const destination = resolveContextLodgingDestinationAnchor(event);
  const userLat = input?.lat ?? null;
  const userLng = input?.lng ?? null;

  if (input?.preferUserLocation && userLat != null && userLng != null) {
    if (haversineKm(userLat, userLng, destination.lat, destination.lng) <= NEAR_DESTINATION_KM) {
      return { lat: userLat, lng: userLng };
    }
  }

  return destination;
}
