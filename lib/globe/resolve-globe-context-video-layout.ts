import {
  GLOBE_ALTITUDE,
  GLOBE_MIN_SAFE_ALTITUDE,
} from "@/lib/globe/globe-zoom-levels";

const REFERENCE_ALTITUDE = GLOBE_ALTITUDE.neighborhood;
const MIN_SCALE = 0.06;
const MAX_SCALE = 1;
const BASE_WIDTH_PX = 168;
const BASE_WIDTH_VW = 0.42;
/** Pin-anchored map photo/video card — 1.25× vs base layout. */
export const MAP_CONTEXT_MEDIA_SIZE_MULTIPLIER = 1.25;

export type GlobeContextVideoScreenLayout = {
  x: number;
  y: number;
  scale: number;
  widthPx: number;
  onScreen: boolean;
};

export function resolveGlobeContextVideoScale(altitude: number): number {
  const safeAltitude = Math.max(altitude, GLOBE_MIN_SAFE_ALTITUDE);
  const raw = REFERENCE_ALTITUDE / safeAltitude;
  const curved = Math.pow(raw, 0.72);
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, curved));
}

export function resolveGlobeContextVideoWidthPx(
  scale: number,
  viewportWidth: number,
): number {
  const base = Math.min(viewportWidth * BASE_WIDTH_VW, BASE_WIDTH_PX);
  return Math.max(
    36,
    Math.round(base * scale * MAP_CONTEXT_MEDIA_SIZE_MULTIPLIER),
  );
}

export function isGlobeContextVideoScreenVisible(
  coords: { x: number; y: number },
  width: number,
  height: number,
): boolean {
  const margin = 48;
  return (
    coords.x >= -margin &&
    coords.x <= width + margin &&
    coords.y >= -margin &&
    coords.y <= height + margin
  );
}

export function resolveGlobeContextVideoScreenLayout(input: {
  screen: { x: number; y: number } | null;
  altitude: number | null | undefined;
  viewportWidth: number;
  viewportHeight: number;
}): GlobeContextVideoScreenLayout | null {
  if (
    !input.screen ||
    !Number.isFinite(input.screen.x) ||
    !Number.isFinite(input.screen.y)
  ) {
    return null;
  }

  const altitude =
    typeof input.altitude === "number" && Number.isFinite(input.altitude)
      ? input.altitude
      : REFERENCE_ALTITUDE;
  const scale = resolveGlobeContextVideoScale(altitude);
  const onScreen = isGlobeContextVideoScreenVisible(
    input.screen,
    input.viewportWidth,
    input.viewportHeight,
  );

  if (!onScreen) {
    return null;
  }

  return {
    x: input.screen.x,
    y: input.screen.y,
    scale,
    widthPx: resolveGlobeContextVideoWidthPx(scale, input.viewportWidth),
    onScreen,
  };
}
