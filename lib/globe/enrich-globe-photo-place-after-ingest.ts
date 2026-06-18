"use client";

import { isCoordsPlaceLabel } from "@/lib/globe/is-coords-place-label";
import { fetchNearbyEateryAtCoords } from "@/lib/globe/fetch-nearby-eatery-at-coords";
import { fetchLocatePlaceFromPhoto } from "@/lib/globe/fetch-locate-place-from-photo";
import { pickBestPhotoPlaceSuggest } from "@/lib/globe/pick-best-photo-place-suggest";
import { applyGlobePhotoPlaceSuggestion } from "@/lib/globe/apply-globe-photo-place-suggestion";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

export function shouldEnrichGlobePhotoPlace(input: {
  context: Pick<
    MediaSpacetimeContext,
    "mediaKind" | "lat" | "lng" | "placeLabel"
  >;
}): boolean {
  if (input.context.mediaKind !== "photo") {
    return false;
  }
  if (input.context.lat == null || input.context.lng == null) {
    return false;
  }
  if (
    input.context.placeLabel &&
    !isCoordsPlaceLabel(input.context.placeLabel)
  ) {
    return false;
  }
  return true;
}

/** After globe photo ingest — suggest nearby eatery + optional vision, inbox confirm. */
export async function enrichGlobePhotoPlaceAfterIngest(input: {
  file: File;
  context: MediaSpacetimeContext;
  eventId: string;
}): Promise<string | null> {
  if (!shouldEnrichGlobePhotoPlace({ context: input.context })) {
    return null;
  }

  const lat = input.context.lat!;
  const lng = input.context.lng!;

  const [nearby, vision] = await Promise.all([
    fetchNearbyEateryAtCoords({ lat, lng }),
    fetchLocatePlaceFromPhoto({ file: input.file, lat, lng }),
  ]);

  const suggestion = pickBestPhotoPlaceSuggest({
    nearby,
    vision,
    captureLat: lat,
    captureLng: lng,
  });

  if (!suggestion) {
    return null;
  }

  const applied = applyGlobePhotoPlaceSuggestion({
    eventId: input.eventId,
    suggestion,
  });
  return applied ? suggestion.placeName : null;
}
