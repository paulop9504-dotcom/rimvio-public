import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  GLOBE_PHOTO_PLACE_SUGGEST_META_KEY,
  type GlobePhotoPlaceSuggestMeta,
} from "@/lib/globe/globe-photo-place-suggest-types";

export function readGlobePhotoPlaceSuggest(
  event: EventCandidate | null | undefined,
): GlobePhotoPlaceSuggestMeta | null {
  const raw = event?.metadata?.[GLOBE_PHOTO_PLACE_SUGGEST_META_KEY];
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Partial<GlobePhotoPlaceSuggestMeta>;
  const placeName = row.placeName?.trim();
  if (
    !placeName ||
    typeof row.lat !== "number" ||
    typeof row.lng !== "number" ||
    !row.source
  ) {
    return null;
  }
  return {
    placeName,
    lat: row.lat,
    lng: row.lng,
    googlePlaceId:
      typeof row.googlePlaceId === "string" ? row.googlePlaceId : null,
    source: row.source,
    suggestedAtIso:
      typeof row.suggestedAtIso === "string"
        ? row.suggestedAtIso
        : new Date().toISOString(),
    distanceM:
      typeof row.distanceM === "number" ? row.distanceM : null,
  };
}
