"use client";

import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { applyGlobeContextPlaceCoords, globeContextHasConfirmedPlace } from "@/lib/globe/apply-globe-context-place-coords";
import { resolveGlobeContextPinCluster } from "@/lib/globe/resolve-globe-context-pin-cluster";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export type FocusGlobeContextResult = {
  cluster: PinCluster;
  geocoded: boolean;
};

/**
 * Resolve saved place coords and return a cluster ready for flyToPin.
 * Geocodes from place text when coords were never confirmed.
 */
export function focusGlobeContextOnMap(
  eventId: string,
): FocusGlobeContextResult | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  let geocoded = false;
  let event = findLifeEventCandidate(key);
  if (event && !globeContextHasConfirmedPlace(event)) {
    const place =
      event.place?.trim() ||
      (typeof event.metadata?.globePlaceLabel === "string"
        ? event.metadata.globePlaceLabel.trim()
        : "");
    if (place) {
      event = applyGlobeContextPlaceCoords(event, place);
      geocoded = true;
    }
  }

  const cluster = resolveGlobeContextPinCluster(key);
  if (!cluster) {
    return null;
  }

  return { cluster, geocoded };
}
