import {
  GLOBE_ALTITUDE,
  GLOBE_MIN_SAFE_ALTITUDE,
  type GlobeDetailLevel,
} from "@/lib/globe/globe-zoom-levels";

const MIN_PIN_UI_SCALE = 0.028;
const MAX_PIN_UI_SCALE = 1;

/** Pin labels shrink faster than map video when zooming out. */
export function resolveGlobePinUiScale(altitude: number): number {
  const safeAltitude = Math.max(altitude, GLOBE_MIN_SAFE_ALTITUDE);
  const raw = GLOBE_ALTITUDE.neighborhood / safeAltitude;
  const curved = Math.pow(raw, 0.68);
  return Math.max(MIN_PIN_UI_SCALE, Math.min(MAX_PIN_UI_SCALE, curved));
}

export function globePinUiScaleForDetailLevel(
  level: GlobeDetailLevel,
): number {
  switch (level) {
    case "space":
      return 0.3;
    case "region":
      return 0.4;
    case "city":
      return 0.55;
    case "neighborhood":
      return 0.78;
    case "street":
      return 0.92;
    case "pin":
      return 1;
    default:
      return 1;
  }
}

/** Blend continuous altitude scale with detail-level floor caps. */
export function resolveGlobePinUiScaleBlended(
  altitude: number,
  detailLevel: GlobeDetailLevel,
): number {
  const continuous = resolveGlobePinUiScale(altitude);
  const levelCap = globePinUiScaleForDetailLevel(detailLevel);
  return Math.min(continuous, levelCap);
}
