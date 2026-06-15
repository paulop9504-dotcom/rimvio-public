import { haversineKm, parseIsoMs } from "@/lib/feed/spacetime-fit";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import type {
  CohesionScoreBreakdown,
  CohesionWindowInput,
} from "@/lib/experience-gravity/cohesion-types";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

const MAX_MEDIA_SCORE = 0.35;
const MAX_THREAD_SCORE = 0.2;
const MAX_PLACE_SCORE = 0.3;
const MAX_TIME_SCORE = 0.15;

function inWindow(
  context: MediaSpacetimeContext,
  startMs: number,
  endMs: number,
): boolean {
  const ms = parseIsoMs(context.capturedAtIso);
  return ms !== null && ms >= startMs && ms <= endMs;
}

function dominantPlaceLabel(contexts: readonly MediaSpacetimeContext[]): string | null {
  const counts = new Map<string, number>();
  for (const row of contexts) {
    const label = row.placeLabel?.trim();
    if (!label) {
      continue;
    }
    const key = resolvePlaceCoordinates(label).label;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

/** Experience Gravity — pure read score for a spacetime media window. */
export function scoreCohesionWindow(input: CohesionWindowInput): CohesionScoreBreakdown {
  const startMs = parseIsoMs(input.windowStartIso) ?? 0;
  const endMs = parseIsoMs(input.windowEndIso) ?? startMs;
  const rows = input.contexts.filter((row) => inWindow(row, startMs, endMs));

  const photoCount = rows.filter((row) => row.mediaKind === "photo").length;
  const videoCount = rows.filter((row) => row.mediaKind === "video").length;
  const mediaCount = photoCount + videoCount;

  const mediaScore = Math.min(MAX_MEDIA_SCORE, (mediaCount / 12) * MAX_MEDIA_SCORE);

  const threads = new Set(
    rows
      .map((row) => row.originRef?.trim())
      .filter((row): row is string => Boolean(row)),
  );
  const threadScore =
    threads.size >= 3
      ? MAX_THREAD_SCORE
      : threads.size === 2
        ? MAX_THREAD_SCORE * 0.65
        : threads.size === 1
          ? MAX_THREAD_SCORE * 0.35
          : 0;

  const place = dominantPlaceLabel(rows);
  let placeScore = 0;
  if (place) {
    const withCoords = rows.filter((row) => row.lat !== null && row.lng !== null);
    if (withCoords.length === 0) {
      placeScore = MAX_PLACE_SCORE * 0.5;
    } else {
      const target = resolvePlaceCoordinates(place);
      const near = withCoords.filter(
        (row) =>
          haversineKm(row.lat!, row.lng!, target.lat, target.lng) <= 35,
      ).length;
      placeScore = (near / withCoords.length) * MAX_PLACE_SCORE;
    }
  }

  const spanMs = Math.max(1, endMs - startMs);
  const density = mediaCount / (spanMs / 3_600_000);
  const timeScore = Math.min(MAX_TIME_SCORE, density * 0.04);

  const total = Math.min(1, mediaScore + threadScore + placeScore + timeScore);

  return {
    mediaScore,
    threadScore,
    placeScore,
    timeScore,
    total,
  };
}
