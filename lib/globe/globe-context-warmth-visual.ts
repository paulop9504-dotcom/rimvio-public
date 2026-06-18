import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";

/** Fade out before neighborhood — pins stay clean up close. */
const WARMTH_FADE_OUT_ALTITUDE = 0.048;
/** Full wash from city zoom upward. */
const WARMTH_FULL_ALTITUDE = 0.3;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0 = hidden (street/pin), 1 = full wash (overview/region). */
export function resolveGlobeContextWarmthOpacity(altitude: number): number {
  if (!Number.isFinite(altitude)) {
    return 0;
  }
  if (altitude >= WARMTH_FULL_ALTITUDE) {
    return 1;
  }
  if (altitude <= WARMTH_FADE_OUT_ALTITUDE) {
    return 0;
  }
  return (
    (altitude - WARMTH_FADE_OUT_ALTITUDE) /
    (WARMTH_FULL_ALTITUDE - WARMTH_FADE_OUT_ALTITUDE)
  );
}

/** Wider kernel when zoomed out — softer territory read. */
export function resolveGlobeContextWarmthBandwidth(altitude: number): number {
  if (!Number.isFinite(altitude)) {
    return 2.2;
  }
  if (altitude >= 1.2) {
    return 4.8;
  }
  if (altitude >= 0.42) {
    return 3.6;
  }
  if (altitude >= 0.14) {
    return 2.6;
  }
  return 1.85;
}

/** Sparse personal data — lift KDE floor without oversaturating dense maps. */
export function resolveGlobeContextWarmthHeatmapSaturation(pointCount: number): number {
  if (pointCount <= 2) {
    return 1.72;
  }
  if (pointCount <= 5) {
    return 1.48;
  }
  if (pointCount <= 12) {
    return 1.28;
  }
  return 1.12;
}

/** Pastel green → yellow → soft red; alpha capped so pins stay legible. */
export function warmthColorForDensity(t: number, layerOpacity: number): string {
  const density = Math.max(0, Math.min(1, t));
  const mix = layerOpacity <= 0 ? 0 : Math.max(0, Math.min(1, layerOpacity));
  let r: number;
  let g: number;
  let b: number;
  if (density < 0.5) {
    const u = density / 0.5;
    r = lerp(88, 255, u);
    g = lerp(196, 214, u);
    b = lerp(132, 96, u);
  } else {
    const u = (density - 0.5) / 0.5;
    r = lerp(255, 248, u);
    g = lerp(214, 113, u);
    b = lerp(96, 113, u);
  }
  const alpha = (0.09 + density * 0.27) * mix;
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha.toFixed(3)})`;
}

export function shouldRenderGlobeContextWarmth(input: {
  enabled: boolean;
  pointCount: number;
  altitude: number;
  detailLevel?: GlobeDetailLevel;
}): boolean {
  if (!input.enabled || input.pointCount < 2) {
    return false;
  }
  if (input.detailLevel === "street" || input.detailLevel === "pin") {
    return false;
  }
  return resolveGlobeContextWarmthOpacity(input.altitude) > 0.02;
}
