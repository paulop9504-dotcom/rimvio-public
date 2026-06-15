import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";

function readEventCoords(event: EventCandidate): {
  lat: number | null;
  lng: number | null;
} {
  const meta = event.metadata ?? {};
  const lat = typeof meta.globeLat === "number" ? meta.globeLat : null;
  const lng = typeof meta.globeLng === "number" ? meta.globeLng : null;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  const place = event.place?.trim();
  if (!place) {
    return { lat: null, lng: null };
  }
  const coords = resolvePlaceCoordinates(place);
  return { lat: coords.lat, lng: coords.lng };
}

/** Staged pool items that spacetime-fit this context (exclude already attached). */
export function countEventMediaPoolMatches(event: EventCandidate): number {
  const plan = readPlanContextFromEvent(event);
  const eventStartIso = event.datetime?.trim();
  if (!eventStartIso) {
    return 0;
  }

  const attached = new Set(
    readFeedCaptureFragments(event)
      .map((row) => row.mediaContextId?.trim())
      .filter(Boolean) as string[],
  );

  const { lat: eventLat, lng: eventLng } = readEventCoords(event);
  const eventPlace = plan?.place?.trim() || event.place?.trim() || null;

  return readMediaContextMemorySnapshot().filter((row) => {
    if (row.poolStatus !== "staged") {
      return false;
    }
    if (attached.has(row.id.trim())) {
      return false;
    }
    if (row.originRef?.trim() === event.id.trim()) {
      return false;
    }
    const fit = scoreSpacetimeFit({
      capturedAtIso: row.capturedAtIso,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      eventStartIso,
      eventEndIso: plan?.windowEndIso ?? null,
      eventPlace,
      eventLat,
      eventLng,
      capturedPlaceLabel: row.placeLabel ?? null,
    });
    return fit.fits;
  }).length;
}
