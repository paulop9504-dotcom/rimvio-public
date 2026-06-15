import { GLOBE_MIN_SAFE_ALTITUDE } from "@/lib/globe/globe-zoom-levels";

export type GlobeVectorMapView = {
  lat: number;
  lng: number;
  zoom: number;
  bearing: number;
  pitch: number;
};

/** Handoff zoom floor — stay on vector above this. */
export const VECTOR_MAP_ENTER_MIN_ZOOM = 14.5;

/** Pinch out below this returns to 3D — only at wide zoom, not casual dismiss. */
export const VECTOR_MAP_EXIT_ZOOM = 12.0;

/** Default vector style — override with NEXT_PUBLIC_GLOBE_VECTOR_STYLE_URL. */
export const GLOBE_VECTOR_MAP_STYLE_URL =
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_GLOBE_VECTOR_STYLE_URL?.trim()
    : "") || "https://tiles.openfreemap.org/styles/liberty";

/** MapLibre zoom from globe.gl altitude — continuous, no cliff at handoff. */
export function vectorMapZoomFromGlobeAltitude(altitude: number): number {
  const safe = Math.max(GLOBE_MIN_SAFE_ALTITUDE, altitude);
  const zoom = 9.06 - Math.log10(safe) * 3.404;
  return Math.min(21, Math.max(12, zoom));
}

/** Inverse — preserve vector zoom when returning to 3D. */
export function globeAltitudeFromVectorMapZoom(zoom: number): number {
  const safe = 10 ** ((9.06 - zoom) / 3.404);
  return Math.max(GLOBE_MIN_SAFE_ALTITUDE, safe);
}

/** Crossfade duration — camera uses jumpTo; opacity bridge carries the motion. */
export const GLOBE_SURFACE_CROSSFADE_MS = 520;

export function buildVectorMapHandoffView(input: {
  lat: number;
  lng: number;
  altitude?: number;
  zoom?: number;
}): GlobeVectorMapView {
  return {
    lat: input.lat,
    lng: input.lng,
    zoom:
      input.zoom ??
      (input.altitude != null
        ? vectorMapZoomFromGlobeAltitude(input.altitude)
        : 15.5),
    bearing: 0,
    pitch: 0,
  };
}

export function shouldExitVectorMapToGlobe3d(zoom: number): boolean {
  return zoom < VECTOR_MAP_EXIT_ZOOM;
}
