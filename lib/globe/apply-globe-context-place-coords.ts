"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import {
  findPersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import { syncGlobeContextCardCoords } from "@/lib/globe/globe-context-card-coords";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function globeContextHasConfirmedPlace(event: EventCandidate): boolean {
  const meta = event.metadata ?? {};
  const lat =
    typeof meta.globePlaceLat === "number" ? meta.globePlaceLat : null;
  const lng =
    typeof meta.globePlaceLng === "number" ? meta.globePlaceLng : null;
  return meta.globePlaceConfirmed === true && lat !== null && lng !== null;
}

/** Persist geocoded place coordinates when the user saves a place label. */
export function applyGlobeContextPlaceCoords(
  event: EventCandidate,
  placeLabel: string,
): EventCandidate {
  const label = placeLabel.trim();
  if (!label) {
    return event;
  }
  return syncGlobeContextCardCoords(event, label);
}

/** Finger-drag preview — does not overwrite card anchor coords. */
export function applyGlobeContextPinDragPreview(input: {
  event: EventCandidate;
  lat: number;
  lng: number;
}): EventCandidate {
  const { globePlaceMovedAt: _removed, ...restMeta } = input.event.metadata ?? {};
  const updated = commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata: {
      ...restMeta,
      globePlaceConfirmed: true,
      globePlaceLat: input.lat,
      globePlaceLng: input.lng,
      globePlaceMovedAt: new Date().toISOString(),
    },
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt,
  });

  const pin = findPersonalGlobePinByEventId(input.event.id);
  if (pin) {
    upsertPersonalGlobePin({
      ...pin,
      lat: input.lat,
      lng: input.lng,
    });
  }

  return updated;
}
