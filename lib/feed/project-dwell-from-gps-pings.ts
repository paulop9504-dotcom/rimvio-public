import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import {
  GPS_PING_INTERVAL_MS,
  GPS_PING_MATCH_WINDOW_MS,
} from "@/lib/location-ping/constants";
import type { GpsPing } from "@/lib/location-ping/types";
import { haversineKm, parseIsoMs } from "@/lib/feed/spacetime-fit";

const TIME_PAD_MS = 6 * 60 * 60 * 1000;
const MAX_PLACE_KM = 25;
const MIN_DWELL_MINUTES = 5;

function pingsInEventWindow(
  pings: readonly GpsPing[],
  windowStartMs: number,
  windowEndMs: number,
  placeLabel?: string | null,
): GpsPing[] {
  const coords = placeLabel?.trim()
    ? resolvePlaceCoordinates(placeLabel.trim())
    : null;

  return pings
    .filter((ping) => {
      const ms = parseIsoMs(ping.capturedAtIso);
      if (ms === null || ms < windowStartMs || ms > windowEndMs) {
        return false;
      }
      if (!coords) {
        return true;
      }
      return haversineKm(ping.lat, ping.lng, coords.lat, coords.lng) <= MAX_PLACE_KM;
    })
    .sort(
      (left, right) =>
        (parseIsoMs(left.capturedAtIso) ?? 0) - (parseIsoMs(right.capturedAtIso) ?? 0),
    );
}

/** Pure read — estimate dwell minutes from GPS pings inside an event window. */
export function projectDwellMinutesFromGpsPings(input: {
  pings: readonly GpsPing[];
  windowStartIso: string;
  windowEndIso?: string | null;
  placeLabel?: string | null;
}): number | null {
  const startMs = parseIsoMs(input.windowStartIso);
  if (startMs === null) {
    return null;
  }
  const endMs = parseIsoMs(input.windowEndIso) ?? startMs;
  const windowStart = startMs - TIME_PAD_MS;
  const windowEnd = endMs + TIME_PAD_MS;

  const matched = pingsInEventWindow(
    input.pings,
    windowStart,
    windowEnd,
    input.placeLabel,
  );
  if (matched.length < 2) {
    return null;
  }

  const gapCap = GPS_PING_MATCH_WINDOW_MS * 2;
  let dwellMs = GPS_PING_INTERVAL_MS;

  for (let index = 1; index < matched.length; index += 1) {
    const prevMs = parseIsoMs(matched[index - 1]!.capturedAtIso);
    const curMs = parseIsoMs(matched[index]!.capturedAtIso);
    if (prevMs === null || curMs === null) {
      continue;
    }
    const gap = curMs - prevMs;
    dwellMs += gap <= gapCap ? gap : GPS_PING_INTERVAL_MS;
  }

  const minutes = Math.round(dwellMs / 60_000);
  return minutes >= MIN_DWELL_MINUTES ? minutes : null;
}

export function formatDwellMinutesLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}분 체류`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return `${hours}시간 체류`;
  }
  return `${hours}시간 ${remainder}분 체류`;
}
