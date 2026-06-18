import { resolvePlaceLabelNearCoords } from "@/lib/location-ping/format-place-label";
import type { GpsPing } from "@/lib/location-ping/types";

export type LiveLocationSnapshot = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  capturedAtIso: string;
  placeLabel: string;
  contextLabel: string;
  timeLabel: string;
};

const MOVING_GAP_MS = 8 * 60_000;

function formatTimeLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "지금";
  }
  const date = new Date(ms);
  return date.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isActivelyDwelling(pings: readonly GpsPing[], nowMs: number): boolean {
  if (pings.length < 3) {
    return false;
  }
  const latest = pings[pings.length - 1]!;
  const latestMs = Date.parse(latest.capturedAtIso);
  if (Number.isNaN(latestMs) || nowMs - latestMs > 10 * 60_000) {
    return false;
  }
  const recent = pings.slice(-3);
  const centerLat = recent.reduce((sum, row) => sum + row.lat, 0) / recent.length;
  const centerLng = recent.reduce((sum, row) => sum + row.lng, 0) / recent.length;
  return recent.every(
    (row) => haversineKm(row.lat, row.lng, centerLat, centerLng) <= 0.35,
  );
}

function resolveContextLabel(pings: readonly GpsPing[], nowMs = Date.now()): string {
  if (isActivelyDwelling(pings, nowMs)) {
    return "체류 중";
  }

  if (pings.length >= 2) {
    const latest = pings[pings.length - 1]!;
    const prev = pings[pings.length - 2]!;
    const gap = Date.parse(latest.capturedAtIso) - Date.parse(prev.capturedAtIso);
    const movedKm = haversineKm(prev.lat, prev.lng, latest.lat, latest.lng);
    if (gap <= MOVING_GAP_MS && movedKm >= 0.15) {
      return "이동 중";
    }
  }

  const latest = pings[pings.length - 1];
  if (latest) {
    const age = nowMs - Date.parse(latest.capturedAtIso);
    if (age <= 6 * 60_000) {
      return "현재 위치";
    }
  }

  return "위치 대기";
}

function haversineKm(
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
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Pure read — latest GPS FACT → globe "you are here" projection. */
export function projectLiveLocationSnapshot(
  pings: readonly GpsPing[],
  nowMs = Date.now(),
): LiveLocationSnapshot | null {
  const latest = pings[pings.length - 1];
  if (!latest) {
    return null;
  }

  const age = nowMs - Date.parse(latest.capturedAtIso);
  if (Number.isNaN(age) || age > 30 * 60_000) {
    return null;
  }

  return {
    lat: latest.lat,
    lng: latest.lng,
    accuracyM: latest.accuracyM,
    capturedAtIso: latest.capturedAtIso,
    placeLabel: resolvePlaceLabelNearCoords(latest.lat, latest.lng),
    contextLabel: resolveContextLabel(pings, nowMs),
    timeLabel: formatTimeLabel(latest.capturedAtIso),
  };
}
