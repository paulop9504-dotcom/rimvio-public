import type { GlobeInstance } from "globe.gl";
import { GLOBE_OVERVIEW_POINT_OF_VIEW } from "@/lib/experience-graph/globe-overview-view";
import { GLOBE_MIN_SAFE_ALTITUDE } from "@/lib/globe/globe-zoom-levels";
import { screenPointToGlobeCoords } from "@/lib/globe/screen-point-to-globe-coords";

const GLOBE_ALTITUDE_MAX = GLOBE_OVERVIEW_POINT_OF_VIEW.altitude;

export function clampGlobeAltitude(altitude: number): number {
  if (!Number.isFinite(altitude)) {
    return GLOBE_MIN_SAFE_ALTITUDE;
  }
  return Math.min(GLOBE_ALTITUDE_MAX, Math.max(GLOBE_MIN_SAFE_ALTITUDE, altitude));
}

/** Spread fingers → zoom in (lower altitude). Gentle curve for map-grade feel. */
export function altitudeFromPinchDistance(
  startAltitude: number,
  startDistance: number,
  currentDistance: number,
): number {
  if (startDistance <= 0 || currentDistance <= 0) {
    return clampGlobeAltitude(startAltitude);
  }
  const ratio = currentDistance / startDistance;
  const curved = ratio ** 1.04;
  return clampGlobeAltitude(startAltitude / curved);
}

export function resolveGlobeScreenCenterClient(root: HTMLElement): {
  clientX: number;
  clientY: number;
} {
  const rect = root.getBoundingClientRect();
  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  };
}

/** Geographic anchor under the viewport center — Naver/Kakao-style pinch pivot. */
export function resolveGlobeCenterAnchorCoords(
  globe: GlobeInstance,
  root: HTMLElement,
): { lat: number; lng: number } {
  const center = resolveGlobeScreenCenterClient(root);
  const coords = screenPointToGlobeCoords(
    globe,
    root,
    center.clientX,
    center.clientY,
  );
  if (coords) {
    return coords;
  }
  const pov = globe.pointOfView();
  return { lat: pov.lat, lng: pov.lng };
}

export function shiftGlobePointOfViewByScreenDelta(
  globe: GlobeInstance,
  root: HTMLElement,
  deltaXPx: number,
  deltaYPx: number,
): void {
  if (Math.abs(deltaXPx) < 0.35 && Math.abs(deltaYPx) < 0.35) {
    return;
  }
  const width = root.clientWidth;
  const height = root.clientHeight;
  if (width <= 0 || height <= 0) {
    return;
  }
  const cx = width / 2;
  const cy = height / 2;
  const pov = globe.pointOfView();
  const refCenter = globe.toGlobeCoords(cx, cy);
  const refShifted = globe.toGlobeCoords(cx + deltaXPx, cy + deltaYPx);
  if (!refCenter || !refShifted) {
    return;
  }
  let deltaLng = refCenter.lng - refShifted.lng;
  while (deltaLng > 180) {
    deltaLng -= 360;
  }
  while (deltaLng < -180) {
    deltaLng += 360;
  }
  globe.pointOfView(
    {
      lat: pov.lat + (refCenter.lat - refShifted.lat),
      lng: pov.lng + deltaLng,
      altitude: pov.altitude,
    },
    0,
  );
}

/** Keep `anchorLat/Lng` pinned to the viewport focal point while changing altitude. */
export function applyGlobeFocalZoom(input: {
  globe: GlobeInstance;
  root: HTMLElement;
  anchorLat: number;
  anchorLng: number;
  focalClientX: number;
  focalClientY: number;
  nextAltitude: number;
}): void {
  const {
    globe,
    root,
    anchorLat,
    anchorLng,
    focalClientX,
    focalClientY,
    nextAltitude,
  } = input;

  const pov = globe.pointOfView();
  globe.pointOfView(
    {
      lat: pov.lat,
      lng: pov.lng,
      altitude: clampGlobeAltitude(nextAltitude),
    },
    0,
  );
  globe.controls().update();

  const rect = root.getBoundingClientRect();
  const targetX = focalClientX - rect.left;
  const targetY = focalClientY - rect.top;

  for (let pass = 0; pass < 3; pass += 1) {
    const screen = globe.getScreenCoords(anchorLat, anchorLng);
    if (!screen) {
      break;
    }
    const deltaX = targetX - screen.x;
    const deltaY = targetY - screen.y;
    if (Math.abs(deltaX) < 0.35 && Math.abs(deltaY) < 0.35) {
      break;
    }
    shiftGlobePointOfViewByScreenDelta(globe, root, deltaX, deltaY);
  }
}
