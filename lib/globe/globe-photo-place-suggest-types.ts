export const GLOBE_PHOTO_PLACE_SUGGEST_META_KEY = "globePhotoPlaceSuggest";

export type GlobePhotoPlaceSuggestSource =
  | "nearby_eatery"
  | "vision_locate"
  | "vision_nearby_merge";

export type GlobePhotoPlaceSuggestMeta = {
  placeName: string;
  lat: number;
  lng: number;
  googlePlaceId: string | null;
  source: GlobePhotoPlaceSuggestSource;
  suggestedAtIso: string;
  distanceM: number | null;
};

export type GlobePhotoPlaceSuggestion = GlobePhotoPlaceSuggestMeta;
