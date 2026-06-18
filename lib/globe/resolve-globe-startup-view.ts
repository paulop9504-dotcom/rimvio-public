import type { GlobeDetailLevel } from "@/lib/globe/globe-zoom-levels";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";

const STARTUP_CLUSTER_RADIUS_M = 120_000;

export type GlobeStartupView = {
  lat: number;
  lng: number;
  level: Extract<GlobeDetailLevel, "region" | "city" | "neighborhood">;
  pinCount: number;
  placeLabel: string;
};

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

function findDensestRegion(clusters: readonly PinCluster[]): {
  lat: number;
  lng: number;
  count: number;
  lead: PinCluster;
} {
  let best = {
    lat: clusters[0]!.lat,
    lng: clusters[0]!.lng,
    count: 1,
    lead: clusters[0]!,
  };

  for (const seed of clusters) {
    const members = clusters.filter(
      (row) =>
        haversineMeters(seed.lat, seed.lng, row.lat, row.lng) <=
        STARTUP_CLUSTER_RADIUS_M,
    );
    if (members.length <= best.count) {
      continue;
    }
    best = {
      lat: members.reduce((sum, row) => sum + row.lat, 0) / members.length,
      lng: members.reduce((sum, row) => sum + row.lng, 0) / members.length,
      count: members.length,
      lead: members[0]!,
    };
  }

  return best;
}

/** App open — fly to the densest pin region, partially zoomed in. */
export function resolveGlobeStartupView(
  clusters: readonly PinCluster[],
): GlobeStartupView | null {
  if (clusters.length === 0) {
    return null;
  }

  if (clusters.length === 1) {
    const only = clusters[0]!;
    return {
      lat: only.lat,
      lng: only.lng,
      level: "neighborhood",
      pinCount: 1,
      placeLabel: only.placeLabel.trim() || only.title.trim() || "맥락",
    };
  }

  const dense = findDensestRegion(clusters);
  const level: GlobeStartupView["level"] =
    dense.count >= 4 ? "city" : dense.count >= 2 ? "neighborhood" : "neighborhood";
  const leadLabel =
    dense.lead.placeLabel.trim() || dense.lead.title.trim() || "맥락";

  return {
    lat: dense.lat,
    lng: dense.lng,
    level,
    pinCount: dense.count,
    placeLabel:
      dense.count > 1 ? `${leadLabel} · 맥락 ${dense.count}개` : leadLabel,
  };
}
