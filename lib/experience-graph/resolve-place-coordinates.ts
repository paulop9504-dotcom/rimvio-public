import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";

export type PlaceCoordinates = {
  lat: number;
  lng: number;
  label: string;
};

const KNOWN_PLACES: ReadonlyArray<{
  pattern: RegExp;
  lat: number;
  lng: number;
  label: string;
}> = [
  { pattern: /제주|애월|성산/u, lat: 33.389, lng: 126.553, label: "제주" },
  { pattern: /둔산/u, lat: 36.351, lng: 127.385, label: "둔산동" },
  { pattern: /강남역|강남/u, lat: 37.498, lng: 127.028, label: "강남역" },
  { pattern: /부산|해운대/u, lat: 35.158, lng: 129.16, label: "부산" },
  { pattern: /인천공항|인천/u, lat: 37.4602, lng: 126.4407, label: "인천공항" },
  { pattern: /서울/u, lat: 37.566, lng: 126.978, label: "서울" },
  { pattern: /홍대|연남/u, lat: 37.557, lng: 126.924, label: "홍대" },
  { pattern: /성수/u, lat: 37.544, lng: 127.055, label: "성수" },
  { pattern: /신림/u, lat: 37.4842, lng: 126.9295, label: "신림동" },
  { pattern: /사당/u, lat: 37.4768, lng: 126.9817, label: "사당" },
  { pattern: /건대|건국대/u, lat: 37.5404, lng: 127.0692, label: "건대" },
];

const DEFAULT_COORDS: PlaceCoordinates = {
  lat: 36.5,
  lng: 127.8,
  label: "한국",
};

/** Pure read — place label → approximate coordinates for globe stage. */
export function resolvePlaceCoordinates(placeLabel: string): PlaceCoordinates {
  const hay = placeLabel.trim();
  if (!hay) {
    return DEFAULT_COORDS;
  }

  const overseas = classifyOverseasManualPlace(hay);
  if (overseas) {
    return { lat: overseas.lat, lng: overseas.lng, label: overseas.label };
  }

  for (const entry of KNOWN_PLACES) {
    if (entry.pattern.test(hay)) {
      return { lat: entry.lat, lng: entry.lng, label: entry.label };
    }
  }

  return { ...DEFAULT_COORDS, label: hay };
}

/** Map lat/lng to 0–100 pin on flat equirectangular projection. */
export function projectLatLngToMapPercent(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}

/** Inverse of projectLatLngToMapPercent — tap on flat globe map. */
export function mapPercentToLatLng(pinX: number, pinY: number): {
  lat: number;
  lng: number;
} {
  const x = Math.min(100, Math.max(0, pinX));
  const y = Math.min(100, Math.max(0, pinY));
  return {
    lng: (x / 100) * 360 - 180,
    lat: 90 - (y / 100) * 180,
  };
}

export function buildSpatialGlobeView(input: {
  lat: number;
  lng: number;
  placeLabel: string;
  zoom?: number;
}): import("@/lib/experience-graph/spatial-media-types").SpatialGlobeView {
  const pin = projectLatLngToMapPercent(input.lat, input.lng);
  return {
    lat: input.lat,
    lng: input.lng,
    pinX: pin.x,
    pinY: pin.y,
    zoom: input.zoom ?? 1.65,
    placeLabel: input.placeLabel,
  };
}
