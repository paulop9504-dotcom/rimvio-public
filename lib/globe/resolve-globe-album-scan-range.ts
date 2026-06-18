import type { EventCandidate } from "@/lib/events/event-candidate";
import { listGlobeContextTimeline } from "@/lib/globe/list-globe-context-timeline";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";

const CONTEXT_PAD_MS = 12 * 60 * 60 * 1000;
const DEFAULT_ROLLING_DAYS = 7;
const MAX_SCAN_SPAN_DAYS = 365 * 5;

export type GlobeAlbumScanRange = {
  sinceMs: number;
  untilMs: number;
  /** True when at least one stored globe context expanded the scan window. */
  hasContextWindows: boolean;
  contextCount: number;
};

/** Album scan bounds — union of globe context windows + recent rolling window. */
export function resolveGlobeAlbumScanRange(input: {
  events: readonly EventCandidate[];
  prefsWindowDays?: number;
  now?: Date;
}): GlobeAlbumScanRange {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const rollingDays = Math.max(1, input.prefsWindowDays ?? DEFAULT_ROLLING_DAYS);
  let sinceMs = nowMs - rollingDays * 86_400_000;
  let untilMs = nowMs;
  let hasContextWindows = false;

  const timeline = listGlobeContextTimeline(input.events, now);
  const entries = [...timeline.future, ...timeline.present, ...timeline.past];

  for (const entry of entries) {
    const startMs = parseIsoMs(entry.startIso);
    const endMs = parseIsoMs(entry.endIso) ?? startMs;
    if (startMs === null) {
      continue;
    }
    hasContextWindows = true;
    sinceMs = Math.min(sinceMs, startMs - CONTEXT_PAD_MS);
    untilMs = Math.max(untilMs, (endMs ?? startMs) + CONTEXT_PAD_MS);
  }

  const maxSpanMs = MAX_SCAN_SPAN_DAYS * 86_400_000;
  if (nowMs - sinceMs > maxSpanMs) {
    sinceMs = nowMs - maxSpanMs;
  }
  if (untilMs > nowMs) {
    untilMs = nowMs;
  }

  return {
    sinceMs,
    untilMs,
    hasContextWindows,
    contextCount: entries.length,
  };
}
