import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readEventMediaPoolAnchorCoords(event: EventCandidate): {
  lat: number | null;
  lng: number | null;
} {
  const meta = event.metadata ?? {};
  const lat =
    readFiniteCoord(meta.globePlaceLat) ??
    readFiniteCoord(meta.gpsDwellLat) ??
    readFiniteCoord(meta.globeLat);
  const lng =
    readFiniteCoord(meta.globePlaceLng) ??
    readFiniteCoord(meta.gpsDwellLng) ??
    readFiniteCoord(meta.globeLng);
  if (lat != null && lng != null) {
    return { lat, lng };
  }
  const place = event.place?.trim();
  if (!place) {
    return { lat: null, lng: null };
  }
  const coords = resolvePlaceCoordinates(place);
  return { lat: coords.lat, lng: coords.lng };
}
