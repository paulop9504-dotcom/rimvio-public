import {
  clampGlobeLatitude,
  latLngToMercatorPixel,
} from "@/lib/experience-graph/reproject-mercator-to-equirectangular";

const TILE_SIZE = 256;

export type FlatMapView = {
  lat: number;
  lng: number;
  /** UI zoom knob — maps to slippy z11–z20. */
  zoom: number;
  /** Drag residue in map pixels — committed to lat/lng on gesture end. */
  panPxX?: number;
  panPxY?: number;
};

export const FLAT_MAP_ZOOM_MIN = 1.05;
/** UI zoom ceiling — allows z20 tile overzoom for alley-level pinch. */
export const FLAT_MAP_ZOOM_MAX = 5.15;
/** Pinch out below this (on release) hands control back to the 3D globe. */
export const FLAT_MAP_EXIT_ZOOM = 1.18;

export function clampFlatMapZoom(zoom: number): number {
  return Math.min(FLAT_MAP_ZOOM_MAX, Math.max(FLAT_MAP_ZOOM_MIN, zoom));
}

/** Continuous slippy zoom — drives pan math + CSS scale between tile levels. */
export function resolveFlatMapSlippyZoomContinuous(viewZoom: number): number {
  const clamped = clampFlatMapZoom(viewZoom);
  return Math.min(20.999, Math.max(11, 8.1 + clamped * 2.85));
}

/** Integer tile level for fetching raster tiles. */
export function resolveFlatMapTileSlippyZoom(viewZoom: number): number {
  return Math.floor(resolveFlatMapSlippyZoomContinuous(viewZoom));
}

/** CSS scale between tile levels so pinch feels continuous (not steppy). */
export function resolveFlatMapZoomScale(viewZoom: number): number {
  const continuous = resolveFlatMapSlippyZoomContinuous(viewZoom);
  return 2 ** (continuous - Math.floor(continuous));
}

const FLAT_MAP_PIN_SCALE_MIN = 0.26;
const FLAT_MAP_PIN_SCALE_MAX = 1;

/** Flat map pin labels shrink when zoomed out (wide area view). */
export function resolveFlatMapPinUiScale(viewZoom: number): number {
  const clamped = clampFlatMapZoom(viewZoom);
  const span = FLAT_MAP_ZOOM_MAX - FLAT_MAP_ZOOM_MIN;
  const t = span > 0 ? (clamped - FLAT_MAP_ZOOM_MIN) / span : 1;
  return FLAT_MAP_PIN_SCALE_MIN + t * (FLAT_MAP_PIN_SCALE_MAX - FLAT_MAP_PIN_SCALE_MIN);
}

/** Rounded slippy level — legacy/tests. */
export function resolveFlatMapSlippyZoom(viewZoom: number): number {
  return Math.round(resolveFlatMapSlippyZoomContinuous(viewZoom));
}

/** Seed flat view when handing off from globe.gl altitude. */
export function flatMapZoomFromGlobeAltitude(altitude: number): number {
  const safe = Math.max(0.001, altitude);
  return clampFlatMapZoom(2.75 - Math.log10(safe) * 0.95);
}

/** Default street-map zoom when opening flat mode directly. */
export const FLAT_MAP_STREET_ZOOM = 3.45;

export function buildFlatMapHandoffView(input: {
  lat: number;
  lng: number;
  altitude?: number;
  zoom?: number;
}): FlatMapView {
  return {
    lat: input.lat,
    lng: input.lng,
    zoom:
      input.zoom ??
      (input.altitude != null
        ? flatMapZoomFromGlobeAltitude(input.altitude)
        : FLAT_MAP_STREET_ZOOM),
  };
}

export function mercatorPixelToLatLng(
  x: number,
  y: number,
  slippyZoom: number,
  tileSize = TILE_SIZE,
): { lat: number; lng: number } {
  const n = 2 ** slippyZoom;
  const lng = (x / (n * tileSize)) * 360 - 180;
  const t = Math.PI * (1 - (2 * y) / (n * tileSize));
  const latRad = Math.atan(Math.sinh(t));
  return {
    lat: clampGlobeLatitude((latRad * 180) / Math.PI),
    lng,
  };
}

/** Incremental drag — keeps tile grid anchored until gesture ends. */
export function panFlatMapViewDelta(
  view: FlatMapView,
  deltaXPx: number,
  deltaYPx: number,
): FlatMapView {
  const scale = resolveFlatMapZoomScale(view.zoom);
  return {
    ...view,
    panPxX: (view.panPxX ?? 0) + deltaXPx / scale,
    panPxY: (view.panPxY ?? 0) + deltaYPx / scale,
  };
}

/** Legacy absolute pan — tests only. */
export function panFlatMapView(
  view: FlatMapView,
  deltaXPx: number,
  deltaYPx: number,
): FlatMapView {
  return commitFlatMapPan(
    panFlatMapViewDelta(view, deltaXPx, deltaYPx),
  );
}

export function commitFlatMapPan(view: FlatMapView): FlatMapView {
  const panPxX = view.panPxX ?? 0;
  const panPxY = view.panPxY ?? 0;
  if (Math.abs(panPxX) < 0.5 && Math.abs(panPxY) < 0.5) {
    return { ...view, panPxX: 0, panPxY: 0 };
  }
  const slippyZoom = resolveFlatMapSlippyZoomContinuous(view.zoom);
  const center = latLngToMercatorPixel(view.lat, view.lng, slippyZoom);
  const next = mercatorPixelToLatLng(
    center.x - panPxX,
    center.y - panPxY,
    slippyZoom,
  );
  return {
    lat: next.lat,
    lng: next.lng,
    zoom: view.zoom,
    panPxX: 0,
    panPxY: 0,
  };
}

export function zoomFlatMapView(view: FlatMapView, factor: number): FlatMapView {
  return { ...view, zoom: clampFlatMapZoom(view.zoom * factor) };
}

export function zoomFlatMapFromPinch(
  view: FlatMapView,
  startZoom: number,
  startDistance: number,
  currentDistance: number,
): FlatMapView {
  if (startDistance <= 0 || currentDistance <= 0) {
    return view;
  }
  const ratio = currentDistance / startDistance;
  const adjusted = ratio ** 0.93;
  return { ...view, zoom: clampFlatMapZoom(startZoom * adjusted) };
}

export function projectFlatMapPinOffset(
  view: FlatMapView,
  pinLat: number,
  pinLng: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  const slippyZoom = resolveFlatMapSlippyZoomContinuous(view.zoom);
  const center = latLngToMercatorPixel(view.lat, view.lng, slippyZoom);
  const pin = latLngToMercatorPixel(pinLat, pinLng, slippyZoom);
  return {
    x: viewportWidth / 2 + (pin.x - center.x) + (view.panPxX ?? 0),
    y: viewportHeight / 2 + (pin.y - center.y) + (view.panPxY ?? 0),
  };
}

export function shouldExitFlatMapToGlobe3d(zoom: number): boolean {
  return zoom <= FLAT_MAP_EXIT_ZOOM;
}
