import { sharesPlaceBrand } from "@/lib/locate/branch-label";
import type { LocateActionResult } from "@/lib/locate/types";
import type { GlobePhotoPlaceSuggestion } from "@/lib/globe/globe-photo-place-suggest-types";
import type { NearbyEateryCandidate } from "@/lib/globe/resolve-nearby-eatery-at-coords";
import { haversineKm } from "@/lib/feed/spacetime-fit";

function toSuggestion(input: {
  placeName: string;
  lat: number;
  lng: number;
  googlePlaceId: string | null;
  source: GlobePhotoPlaceSuggestion["source"];
  distanceM: number | null;
}): GlobePhotoPlaceSuggestion {
  return {
    placeName: input.placeName,
    lat: input.lat,
    lng: input.lng,
    googlePlaceId: input.googlePlaceId,
    source: input.source,
    suggestedAtIso: new Date().toISOString(),
    distanceM: input.distanceM,
  };
}

/** Merge GPS nearby POI with optional vision locate result. */
export function pickBestPhotoPlaceSuggest(input: {
  nearby: NearbyEateryCandidate | null;
  vision: LocateActionResult | null;
  captureLat: number;
  captureLng: number;
}): GlobePhotoPlaceSuggestion | null {
  const visionName = input.vision?.place_name?.trim();

  if (visionName && input.nearby) {
    if (sharesPlaceBrand(input.nearby.placeName, visionName)) {
      return toSuggestion({
        placeName: input.nearby.placeName,
        lat: input.nearby.lat,
        lng: input.nearby.lng,
        googlePlaceId: input.nearby.googlePlaceId,
        source: "vision_nearby_merge",
        distanceM: input.nearby.distanceM,
      });
    }
  }

  if (visionName && input.vision) {
    const distanceM =
      Number.isFinite(input.vision.lat) && Number.isFinite(input.vision.lng)
        ? haversineKm(
            input.captureLat,
            input.captureLng,
            input.vision.lat,
            input.vision.lng,
          ) * 1000
        : null;
    return toSuggestion({
      placeName: visionName,
      lat: input.vision.lat,
      lng: input.vision.lng,
      googlePlaceId: null,
      source: "vision_locate",
      distanceM,
    });
  }

  if (input.nearby) {
    return toSuggestion({
      placeName: input.nearby.placeName,
      lat: input.nearby.lat,
      lng: input.nearby.lng,
      googlePlaceId: input.nearby.googlePlaceId,
      source: "nearby_eatery",
      distanceM: input.nearby.distanceM,
    });
  }

  return null;
}
