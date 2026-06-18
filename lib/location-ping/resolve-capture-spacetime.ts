import {
  GPS_PING_FALLBACK_LOOKBACK_MS,
  GPS_PING_MATCH_WINDOW_MS,
} from "@/lib/location-ping/constants";
import { readImageExifMetadata } from "@/lib/location-ping/read-image-exif-metadata";
import type { GpsPing, SpacetimeResolveSource } from "@/lib/location-ping/types";

export type ResolvedCaptureSpacetime = {
  capturedAtIso: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  resolveSource: SpacetimeResolveSource;
  matchedPingId: string | null;
};

/** EXIF capture older than this vs upload time → skip live GPS boost / ping fallback. */
export const HISTORICAL_CAPTURE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

export function isHistoricalCaptureMs(capturedMs: number, nowMs: number): boolean {
  return nowMs - capturedMs > HISTORICAL_CAPTURE_THRESHOLD_MS;
}

function nearestPing(
  pings: readonly GpsPing[],
  targetMs: number,
  windowMs: number,
): GpsPing | null {
  let best: GpsPing | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const ping of pings) {
    const pingMs = parseMs(ping.capturedAtIso);
    if (pingMs === null) {
      continue;
    }
    const delta = Math.abs(pingMs - targetMs);
    if (delta <= windowMs && delta < bestDelta) {
      best = ping;
      bestDelta = delta;
    }
  }

  return best;
}

function latestPingBefore(
  pings: readonly GpsPing[],
  targetMs: number,
  lookbackMs: number,
): GpsPing | null {
  let best: GpsPing | null = null;
  let bestMs = Number.NEGATIVE_INFINITY;

  for (const ping of pings) {
    const pingMs = parseMs(ping.capturedAtIso);
    if (pingMs === null || pingMs > targetMs || targetMs - pingMs > lookbackMs) {
      continue;
    }
    if (pingMs > bestMs) {
      best = ping;
      bestMs = pingMs;
    }
  }

  return best;
}

function resolveCaptureInstant(input: {
  file: File;
  exifDateIso: string | null;
  nowMs: number;
}): { capturedAtIso: string; resolveSource: SpacetimeResolveSource } {
  if (input.exifDateIso) {
    return { capturedAtIso: input.exifDateIso, resolveSource: "exif_datetime" };
  }

  const fileMs = input.file.lastModified;
  if (
    fileMs > 0 &&
    input.nowMs - fileMs < 30 * 24 * 60 * 60 * 1000 &&
    fileMs <= input.nowMs + 60_000
  ) {
    return {
      capturedAtIso: new Date(fileMs).toISOString(),
      resolveSource: "file_mtime",
    };
  }

  return {
    capturedAtIso: new Date(input.nowMs).toISOString(),
    resolveSource: "now",
  };
}

/** Correlate a photo/video file with EXIF or nearest GPS ping buffer entry. */
export async function resolveCaptureSpacetime(input: {
  file: File;
  pings: readonly GpsPing[];
  now?: Date;
}): Promise<ResolvedCaptureSpacetime> {
  const nowMs = (input.now ?? new Date()).getTime();
  const exif = await readImageExifMetadata(input.file);
  const instant = resolveCaptureInstant({
    file: input.file,
    exifDateIso: exif.dateTimeIso,
    nowMs,
  });
  const targetMs = parseMs(instant.capturedAtIso) ?? nowMs;
  const historical = isHistoricalCaptureMs(targetMs, nowMs);

  const hasExifGps =
    exif.lat !== null &&
    exif.lng !== null &&
    Number.isFinite(exif.lat) &&
    Number.isFinite(exif.lng);

  if (hasExifGps) {
    return {
      capturedAtIso: instant.capturedAtIso,
      lat: exif.lat,
      lng: exif.lng,
      accuracyM: null,
      resolveSource: "exif_gps",
      matchedPingId: null,
    };
  }

  const matched = historical
    ? nearestPing(input.pings, targetMs, GPS_PING_MATCH_WINDOW_MS)
    : nearestPing(input.pings, targetMs, GPS_PING_MATCH_WINDOW_MS) ??
      latestPingBefore(
        input.pings,
        historical ? targetMs : nowMs,
        GPS_PING_FALLBACK_LOOKBACK_MS,
      );

  if (!matched) {
    return {
      capturedAtIso: instant.capturedAtIso,
      lat: null,
      lng: null,
      accuracyM: null,
      resolveSource: instant.resolveSource,
      matchedPingId: null,
    };
  }

  const matchedMs = parseMs(matched.capturedAtIso) ?? targetMs;
  const usedPing =
    Math.abs(matchedMs - targetMs) <= GPS_PING_MATCH_WINDOW_MS;

  return {
    capturedAtIso: instant.capturedAtIso,
    lat: matched.lat,
    lng: matched.lng,
    accuracyM: matched.accuracyM,
    resolveSource: usedPing ? "gps_ping" : "last_known_ping",
    matchedPingId: matched.id,
  };
}
