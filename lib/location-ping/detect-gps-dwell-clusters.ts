import {
  GPS_PING_INTERVAL_MS,
  GPS_PING_MATCH_WINDOW_MS,
} from "@/lib/location-ping/constants";
import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";
import type { GpsDwellCluster } from "@/lib/location-ping/gps-dwell-cluster-types";
import type { GpsPing } from "@/lib/location-ping/types";
import { haversineKm, parseIsoMs } from "@/lib/feed/spacetime-fit";

const MIN_PING_COUNT = 3;
const MIN_DWELL_MINUTES = 15;
const MAX_GAP_MS = GPS_PING_MATCH_WINDOW_MS * 2;
const MAX_STEP_KM = 5;
const CLUSTER_CLOSE_AGE_MS = 10 * 60 * 1000;

function clusterId(startIso: string, lat: number, lng: number): string {
  const startMs = parseIsoMs(startIso) ?? 0;
  return `gps-dwell:${startMs}:${Math.round(lat * 1000)}:${Math.round(lng * 1000)}`;
}

function resolveClusterPlaceLabel(lat: number, lng: number): string {
  return resolvePlaceLabelNearCoords(lat, lng);
}

function estimateDwellMinutes(pings: readonly GpsPing[]): number {
  if (pings.length < 2) {
    return 0;
  }
  let dwellMs = GPS_PING_INTERVAL_MS;
  for (let index = 1; index < pings.length; index += 1) {
    const prevMs = parseIsoMs(pings[index - 1]!.capturedAtIso);
    const curMs = parseIsoMs(pings[index]!.capturedAtIso);
    if (prevMs === null || curMs === null) {
      continue;
    }
    const gap = curMs - prevMs;
    dwellMs += gap <= MAX_GAP_MS ? gap : GPS_PING_INTERVAL_MS;
  }
  return Math.round(dwellMs / 60_000);
}

function buildCluster(pings: readonly GpsPing[]): GpsDwellCluster | null {
  if (pings.length < MIN_PING_COUNT) {
    return null;
  }

  const dwellMinutes = estimateDwellMinutes(pings);
  if (dwellMinutes < MIN_DWELL_MINUTES) {
    return null;
  }

  const lat =
    pings.reduce((sum, ping) => sum + ping.lat, 0) / pings.length;
  const lng =
    pings.reduce((sum, ping) => sum + ping.lng, 0) / pings.length;
  const startIso = pings[0]!.capturedAtIso;
  const endIso = pings[pings.length - 1]!.capturedAtIso;

  return {
    id: clusterId(startIso, lat, lng),
    startIso,
    endIso,
    lat,
    lng,
    placeLabel: resolveClusterPlaceLabel(lat, lng),
    dwellMinutes,
    pingCount: pings.length,
  };
}

/** Pure read — closed dwell clusters ready for Feed Event ingest. */
export function detectGpsDwellClusters(
  pings: readonly GpsPing[],
  now = new Date(),
): GpsDwellCluster[] {
  const sorted = [...pings].sort(
    (left, right) =>
      (parseIsoMs(left.capturedAtIso) ?? 0) -
      (parseIsoMs(right.capturedAtIso) ?? 0),
  );

  const nowMs = now.getTime();
  const clusters: GpsDwellCluster[] = [];
  let bucket: GpsPing[] = [];

  const flush = () => {
    const cluster = buildCluster(bucket);
    if (!cluster) {
      bucket = [];
      return;
    }
    const endMs = parseIsoMs(cluster.endIso);
    if (endMs !== null && nowMs - endMs >= CLUSTER_CLOSE_AGE_MS) {
      clusters.push(cluster);
    }
    bucket = [];
  };

  for (const ping of sorted) {
    if (bucket.length === 0) {
      bucket.push(ping);
      continue;
    }

    const last = bucket[bucket.length - 1]!;
    const lastMs = parseIsoMs(last.capturedAtIso);
    const curMs = parseIsoMs(ping.capturedAtIso);
    if (lastMs === null || curMs === null) {
      flush();
      bucket.push(ping);
      continue;
    }

    const gap = curMs - lastMs;
    const stepKm = haversineKm(last.lat, last.lng, ping.lat, ping.lng);
    if (gap > MAX_GAP_MS || stepKm > MAX_STEP_KM) {
      flush();
      bucket.push(ping);
      continue;
    }

    bucket.push(ping);
  }

  flush();
  return clusters;
}
