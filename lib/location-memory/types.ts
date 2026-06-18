export type SearchActivityKind =
  | "place_search"
  | "place_confirm"
  | "place_pick"
  | "discovery"
  | "navigation"
  | "media_upload";

export type SearchActivityEntry = {
  id: string;
  query: string;
  kind: SearchActivityKind;
  region_label: string | null;
  place_label: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
};

export type LifeZoneEvidence = {
  date_label: string;
  query: string;
};

export type LifeZoneInference = {
  label: string;
  confidence: number;
  evidence: LifeZoneEvidence[];
  transparent_line: string;
};

export type LocationMemoryWire = {
  recentActivities: SearchActivityEntry[];
  lifeZone: LifeZoneInference | null;
};
