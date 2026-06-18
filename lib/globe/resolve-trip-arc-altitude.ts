import { haversineKm } from "@/lib/feed/spacetime-fit";
import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";

const EARTH_RADIUS_KM = 6371;

/** Peak lift (km) from trip distance — short hops stay flat, long hauls cap out. */
export function resolveTripArcPeakKm(input: {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  emphasis?: GlobeTripArc["emphasis"];
}): number {
  const distanceKm = haversineKm(
    input.startLat,
    input.startLng,
    input.endLat,
    input.endLng,
  );

  const ratio =
    GLOBE_TOSS_THEME.tripArcPeakToDistanceRatio *
    (input.emphasis === "focused"
      ? GLOBE_TOSS_THEME.tripArcFocusedPeakMultiplier
      : 1);

  const rawPeakKm = distanceKm * ratio;
  return Math.min(
    GLOBE_TOSS_THEME.tripArcMaxPeakKm,
    Math.max(GLOBE_TOSS_THEME.tripArcMinPeakKm, rawPeakKm),
  );
}

/** globe.gl arcAltitude — fraction of globe radius at arc midpoint. */
export function resolveTripArcAltitude(arc: Pick<
  GlobeTripArc,
  "startLat" | "startLng" | "endLat" | "endLng" | "emphasis"
>): number {
  const peakKm = resolveTripArcPeakKm(arc);
  return peakKm / EARTH_RADIUS_KM;
}
