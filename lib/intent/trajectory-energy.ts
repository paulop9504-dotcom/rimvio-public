import type { SaveTrajectoryEntry, TrajectoryCluster } from "@/lib/intent/kernel-types";
import { mapSaveToTrajectoryCluster } from "@/lib/intent/category-map";

const TRAJECTORY_LAMBDA = 0.12;

function hoursSince(iso: string, now = Date.now()) {
  return Math.max(0, (now - new Date(iso).getTime()) / (1000 * 60 * 60));
}

export function computeTrajectoryEnergy(
  history: SaveTrajectoryEntry[],
  now = Date.now()
): { dominant_cluster: TrajectoryCluster; strength: number } {
  if (history.length === 0) {
    return { dominant_cluster: "unknown", strength: 0 };
  }

  const totals = new Map<TrajectoryCluster, number>();

  for (const entry of history) {
    const cluster = mapSaveToTrajectoryCluster(entry);
    const weight = Math.exp(-TRAJECTORY_LAMBDA * hoursSince(entry.timestamp, now));
    totals.set(cluster, (totals.get(cluster) ?? 0) + weight);
  }

  let dominant: TrajectoryCluster = "unknown";
  let best = 0;
  let sum = 0;

  for (const [cluster, value] of totals) {
    sum += value;
    if (value > best) {
      best = value;
      dominant = cluster;
    }
  }

  if (sum <= 0 || dominant === "unknown") {
    return { dominant_cluster: "unknown", strength: 0 };
  }

  const strength = Math.max(0, Math.min(1, Number((best / sum).toFixed(3))));
  return { dominant_cluster: dominant, strength };
}

export function trajectorySignalDelta(strength: number) {
  if (strength >= 0.65) {
    return 12;
  }
  if (strength >= 0.4) {
    return 6;
  }
  return 0;
}
