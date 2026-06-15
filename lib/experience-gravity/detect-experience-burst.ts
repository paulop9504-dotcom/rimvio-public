import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveSpacetimeFeedTarget } from "@/lib/feed/resolve-spacetime-feed-target";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import type { ExperienceBurstCandidate } from "@/lib/experience-gravity/cohesion-types";
import { scoreCohesionWindow } from "@/lib/experience-gravity/score-cohesion-window";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

export const EXPERIENCE_BURST_THRESHOLD = 0.58;
export const EXPERIENCE_BURST_MIN_MEDIA = 4;
const DEFAULT_WINDOW_MS = 6 * 60 * 60 * 1000;

function buildBurstTitle(placeLabel: string | null, photoCount: number): string {
  if (placeLabel) {
    return `${placeLabel} · 경험`;
  }
  if (photoCount >= 8) {
    return "함께한 순간";
  }
  return "오늘의 경험";
}

/** Detect energy concentration — wedding-like media burst in a window. */
export function detectExperienceBurst(input: {
  contexts: readonly MediaSpacetimeContext[];
  events?: readonly EventCandidate[];
  now?: Date;
  windowMs?: number;
}): ExperienceBurstCandidate | null {
  const now = input.now ?? new Date();
  const windowMs = input.windowMs ?? DEFAULT_WINDOW_MS;
  const endMs = now.getTime();
  const startMs = endMs - windowMs;

  const windowRows = input.contexts.filter((row) => {
    const ms = parseIsoMs(row.capturedAtIso);
    return ms !== null && ms >= startMs && ms <= endMs;
  });

  if (windowRows.length < EXPERIENCE_BURST_MIN_MEDIA) {
    return null;
  }

  const windowStartIso = new Date(startMs).toISOString();
  const windowEndIso = new Date(endMs).toISOString();
  const breakdown = scoreCohesionWindow({
    contexts: input.contexts,
    windowStartIso,
    windowEndIso,
  });

  if (breakdown.total < EXPERIENCE_BURST_THRESHOLD) {
    return null;
  }

  const photoCount = windowRows.filter((row) => row.mediaKind === "photo").length;
  const videoCount = windowRows.filter((row) => row.mediaKind === "video").length;
  const peerThreadIds = [
    ...new Set(
      windowRows
        .map((row) => row.originRef?.trim())
        .filter((row): row is string => Boolean(row)),
    ),
  ];

  const anchor = windowRows[windowRows.length - 1]!;
  const match = input.events
    ? resolveSpacetimeFeedTarget({
        capturedAtIso: anchor.capturedAtIso,
        lat: anchor.lat,
        lng: anchor.lng,
        placeLabel: anchor.placeLabel,
        events: input.events,
      })
    : null;

  const placeLabel =
    match?.placeLabel?.trim() ||
    anchor.placeLabel?.trim() ||
    "이곳";
  const title =
    match?.eventTitle?.trim() || buildBurstTitle(placeLabel, photoCount);

  return {
    burstId: `burst:${startMs}:${placeLabel.toLowerCase()}`,
    title,
    placeLabel,
    windowStartIso,
    windowEndIso,
    photoCount,
    videoCount,
    uniqueThreadCount: peerThreadIds.length,
    contextIds: windowRows.map((row) => row.id),
    peerThreadIds,
    targetEventId: match?.eventId ?? null,
    score: breakdown.total,
    recallLine: `맥락 응집 · ${title} · 사진 ${photoCount}${videoCount > 0 ? ` · 영상 ${videoCount}` : ""}`,
  };
}
