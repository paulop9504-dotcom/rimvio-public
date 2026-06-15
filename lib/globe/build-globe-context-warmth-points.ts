import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import type { GlobeContextWarmthPoint } from "@/lib/globe/globe-context-warmth-types";

/** Richer traces weigh slightly more — stays subtle on the heatmap. */
export function scorePinClusterWarmth(cluster: PinCluster): number {
  if (cluster.variant === "bridge_ghost") {
    return 0;
  }
  const evidence = cluster.evidence;
  let weight = 1;
  weight += Math.min(evidence.photoCount, 12) * 0.08;
  weight += Math.min(evidence.videoCount, 4) * 0.15;
  weight += Math.min(evidence.chatCount, 6) * 0.05;
  weight += Math.min(evidence.placePinCount, 3) * 0.04;
  return weight;
}

export function buildGlobeContextWarmthPoints(
  clusters: readonly PinCluster[],
): GlobeContextWarmthPoint[] {
  const points: GlobeContextWarmthPoint[] = [];
  for (const cluster of clusters) {
    const weight = scorePinClusterWarmth(cluster);
    if (weight <= 0) {
      continue;
    }
    if (
      !Number.isFinite(cluster.lat) ||
      !Number.isFinite(cluster.lng)
    ) {
      continue;
    }
    points.push({
      lat: cluster.lat,
      lng: cluster.lng,
      weight,
    });
  }
  return points;
}
