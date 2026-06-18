import {
  mapPercentToLatLng,
  projectLatLngToMapPercent,
} from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";

export const GLOBE_ZOOM_MIN = 0.72;
export const GLOBE_ZOOM_MAX = 4.8;

export function wrapGlobePinX(pinX: number): number {
  let x = pinX;
  while (x < 0) {
    x += 100;
  }
  while (x >= 100) {
    x -= 100;
  }
  return x;
}

function clampPinY(pinY: number): number {
  return Math.min(100, Math.max(0, pinY));
}

function viewFromPinPercent(
  view: SpatialGlobeView,
  pinX: number,
  pinY: number,
): SpatialGlobeView {
  const wrappedX = wrapGlobePinX(pinX);
  const clampedY = clampPinY(pinY);
  const { lat, lng } = mapPercentToLatLng(wrappedX, clampedY);
  return {
    ...view,
    pinX: wrappedX,
    pinY: clampedY,
    lat,
    lng,
  };
}

/** Drag the map — positive deltaX moves the globe with the finger (natural grab). */
export function shiftGlobeByPixelDelta(
  view: SpatialGlobeView,
  deltaX: number,
  deltaY: number,
  sphereDiameterPx: number,
): SpatialGlobeView {
  const safeDiameter = Math.max(120, sphereDiameterPx);
  const percentPerPx = (100 / safeDiameter) * (2.4 / view.zoom);
  return viewFromPinPercent(
    view,
    view.pinX - deltaX * percentPerPx,
    view.pinY - deltaY * percentPerPx,
  );
}

export function clampGlobeZoom(zoom: number): number {
  return Math.min(GLOBE_ZOOM_MAX, Math.max(GLOBE_ZOOM_MIN, zoom));
}

export function zoomGlobeView(
  view: SpatialGlobeView,
  factor: number,
): SpatialGlobeView {
  return {
    ...view,
    zoom: clampGlobeZoom(view.zoom * factor),
  };
}

/** Pinch or wheel — scale relative to a start zoom snapshot. */
export function zoomGlobeFromPinch(
  view: SpatialGlobeView,
  startZoom: number,
  startDistance: number,
  currentDistance: number,
): SpatialGlobeView {
  if (startDistance <= 0 || currentDistance <= 0) {
    return view;
  }
  const ratio = currentDistance / startDistance;
  return {
    ...view,
    zoom: clampGlobeZoom(startZoom * ratio),
  };
}

export function recenterGlobeView(
  view: SpatialGlobeView,
  lat: number,
  lng: number,
): SpatialGlobeView {
  const pin = projectLatLngToMapPercent(lat, lng);
  return viewFromPinPercent(view, pin.x, pin.y);
}
