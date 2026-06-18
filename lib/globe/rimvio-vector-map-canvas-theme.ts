import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";

/** Muted canvas palette — pins and Me stay in focus. */
export const RIMVIO_VECTOR_MAP_CANVAS = {
  /** Base paper — matches Toss shell gray. */
  background: GLOBE_TOSS_THEME.shellBg,
  /** Rivers / lakes — low-saturation calm blue, fill only. */
  waterFill: "#d4e2ee",
  /** Parks / green — pastel, lower chroma than activity UI. */
  parkFill: "#e8f2e8",
  parkOpacity: 0.52,
  /** Roads — grayscale hierarchy. */
  roadMinor: "#ffffff",
  roadMid: "#eceef1",
  roadMajor: "#dfe2e6",
  roadCasing: "#d1d5db",
  /** Buildings — near-neutral extrusion. */
  buildingFill: "#e8eaed",
  buildingOpacity: 0.62,
  /** Secondary map copy — never compete with pins. */
  labelMuted: GLOBE_TOSS_THEME.inkMuted,
  waterLabel: "#a8bac8",
  residentialFill: "#f0f1f3",
} as const;

/** OpenFreeMap Liberty — water line layers (merged into fill tone). */
export const RIMVIO_VECTOR_WATER_LINE_LAYERS = [
  "waterway_river",
  "waterway_other",
  "waterway_tunnel",
] as const;

/** Green / park fill layers. */
export const RIMVIO_VECTOR_GREEN_FILL_LAYERS = [
  "park",
  "landcover_wood",
  "landcover_grass",
  "landuse_pitch",
  "landuse_track",
  "landuse_cemetery",
] as const;

/** Clutter — Rimvio pins replace POI dots. */
export const RIMVIO_VECTOR_HIDDEN_LAYERS = [
  "park_outline",
  "poi_r1",
  "poi_r7",
  "poi_r20",
  "poi_transit",
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
] as const;

/** Street / water labels — muted, not hero. */
export const RIMVIO_VECTOR_MUTED_LABEL_LAYERS = [
  "highway-name-path",
  "highway-name-minor",
  "highway-name-major",
  "waterway_line_label",
  "water_name_point_label",
  "water_name_line_label",
] as const;

const ROAD_LAYER_PREFIXES = ["road_", "tunnel_", "bridge_"] as const;

export function isRimvioVectorRoadLayerId(layerId: string): boolean {
  return ROAD_LAYER_PREFIXES.some((prefix) => layerId.startsWith(prefix));
}

export function resolveRimvioVectorRoadLineColor(layerId: string): string {
  if (layerId.includes("_casing")) {
    return RIMVIO_VECTOR_MAP_CANVAS.roadCasing;
  }
  if (
    layerId.includes("motorway") ||
    layerId.includes("trunk") ||
    layerId.includes("primary") ||
    layerId.includes("secondary") ||
    layerId.includes("tertiary")
  ) {
    return RIMVIO_VECTOR_MAP_CANVAS.roadMajor;
  }
  if (layerId.includes("rail") || layerId.includes("transit")) {
    return RIMVIO_VECTOR_MAP_CANVAS.roadCasing;
  }
  return RIMVIO_VECTOR_MAP_CANVAS.roadMinor;
}
