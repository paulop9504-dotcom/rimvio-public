export type PlaceVibe = "quiet" | "lively" | "work" | "unknown";

export type FindPlaceIntent = "FIND_CAFE" | "FIND_PLACE";

export type PlaceDiscoveryCriteria = {
  intent: FindPlaceIntent;
  query: string;
  category: string;
  cuisine_keyword: string | null;
  vibe: PlaceVibe;
  only_open_now: boolean;
  min_rating: number;
  max_results: number;
  radius_m: number;
};

export type PlaceCandidate = {
  place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number;
  open_now: boolean;
  vibes: PlaceVibe[];
  phone: string | null;
  maps_url: string | null;
  thumbnail_url?: string | null;
  photo_urls?: string[];
  naver_category?: string | null;
  description?: string | null;
};

export type PlacePreferenceContext = {
  quiet_affinity: number;
  visited_places: string[];
  shadow_hint: string | null;
};

export type PlaceCandidateEnriched = PlaceCandidate & {
  reason: string;
  travel_minutes: number;
  arrive_at_clock: string;
  shadow_match: boolean;
};

export type CafeDiscoveryWire = {
  action: "SHOW_CAFE_CARDS";
  summary: string;
  options: Array<{
    name: string;
    reason: string;
    rating: number;
    thumbnail_url: string | null;
    photo_urls: string[];
    category: string | null;
    travel_minutes: number;
    arrive_at: string;
    action_buttons: Array<{ label: string; href: string; icon?: string }>;
  }>;
};

export type PlaceDiscoveryContext = {
  criteria: PlaceDiscoveryCriteria;
  candidates: PlaceCandidateEnriched[];
  preference: PlacePreferenceContext;
};
