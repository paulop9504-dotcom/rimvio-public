import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

export const GLOBE_CONTEXT_STACK_VISIBLE_MAX = 5;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Tap hit radius — only when zoomed enough to see individual pins. */
export function globeContextTapHitRadiusMeters(
  detailLevel: GlobeDetailLevel,
): number | null {
  switch (detailLevel) {
    case "space":
    case "region":
    case "city":
      return null;
    case "neighborhood":
      return 420;
    case "street":
      return 160;
    case "pin":
      return 70;
    default:
      return null;
  }
}

function startedAtMs(cluster: PinCluster): number {
  const raw = cluster.startedAtIso?.trim();
  if (!raw) {
    return 0;
  }
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Context pin clusters within tap reach at the current zoom level. */
export function resolveGlobeContextsNearTap(input: {
  tapLat: number;
  tapLng: number;
  clusters: readonly PinCluster[];
  detailLevel: GlobeDetailLevel;
  maxResults?: number;
}): PinCluster[] {
  const radiusM = globeContextTapHitRadiusMeters(input.detailLevel);
  if (
    radiusM == null ||
    !Number.isFinite(input.tapLat) ||
    !Number.isFinite(input.tapLng)
  ) {
    return [];
  }

  const maxResults = input.maxResults ?? 24;

  return input.clusters
    .map((cluster) => ({
      cluster,
      distanceM: haversineMeters(
        input.tapLat,
        input.tapLng,
        cluster.lat,
        cluster.lng,
      ),
    }))
    .filter((row) => row.distanceM <= radiusM)
    .sort((left, right) => {
      if (left.distanceM !== right.distanceM) {
        return left.distanceM - right.distanceM;
      }
      return startedAtMs(right.cluster) - startedAtMs(left.cluster);
    })
    .slice(0, maxResults)
    .map((row) => row.cluster);
}
