import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";
import { readEventMediaPoolAnchorCoords } from "@/lib/globe/passive-context/read-event-media-pool-anchor-coords";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

/** Staged pool rows that spacetime-fit a verified context. */
export function listEventMediaPoolMatches(
  event: EventCandidate,
): MediaSpacetimeContext[] {
  const plan = readPlanContextFromEvent(event);
  const eventStartIso = event.datetime?.trim();
  if (!eventStartIso) {
    return [];
  }

  const attached = new Set(
    readFeedCaptureFragments(event)
      .map((row) => row.mediaContextId?.trim())
      .filter(Boolean) as string[],
  );

  const { lat: eventLat, lng: eventLng } = readEventMediaPoolAnchorCoords(event);
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
  });
}
