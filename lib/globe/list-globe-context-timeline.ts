import type { EventCandidate } from "@/lib/events/event-candidate";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import { isGlobeContextRemoved } from "@/lib/globe/delete-globe-context";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type GlobeContextTiming = "future" | "present" | "past";

export type GlobeContextTimelineEntry = {
  eventId: string;
  title: string;
  place: string;
  timing: GlobeContextTiming;
  startIso: string | null;
  endIso: string | null;
  dateLabel: string | null;
  rangeLabel: string | null;
  photoCount: number;
  videoCount: number;
  manual: boolean;
  lat: number;
  lng: number;
  sortMs: number;
};

export type GlobeContextTimeline = {
  future: GlobeContextTimelineEntry[];
  present: GlobeContextTimelineEntry[];
  past: GlobeContextTimelineEntry[];
  total: number;
};

function isGlobeContextEvent(event: EventCandidate): boolean {
  if (isGlobeContextRemoved(event)) {
    return false;
  }
  const meta = event.metadata ?? {};
  if (meta.globeManualContext === true || meta.targetingSource === "globe_manual") {
    return true;
  }
  if (findPersonalGlobePinByEventId(event.id)) {
    return true;
  }
  const plan = readPlanContextFromEvent(event);
  return Boolean(plan?.place?.trim() && meta.feedPlanEnabled === true);
}

function parseMs(iso: string | null | undefined): number | null {
  const raw = iso?.trim();
  if (!raw) {
    return null;
  }
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

function classifyTiming(startMs: number | null, endMs: number | null, nowMs: number): GlobeContextTiming {
  const start = startMs ?? endMs ?? nowMs;
  const end = endMs ?? startMs ?? nowMs;
  const bufferMs = 12 * 60 * 60 * 1000;

  if (start > nowMs + bufferMs) {
    return "future";
  }
  if (end < nowMs - bufferMs) {
    return "past";
  }
  return "present";
}

function buildRangeLabel(startIso: string | null, endIso: string | null): string | null {
  const start = formatPinDateLabel(startIso);
  const end = formatPinDateLabel(endIso);
  if (start && end && start !== end) {
    return `${start} – ${end}`;
  }
  return start ?? end;
}

function projectEntry(event: EventCandidate, now = new Date()): GlobeContextTimelineEntry | null {
  if (!isGlobeContextEvent(event)) {
    return null;
  }

  const plan = readPlanContextFromEvent(event);
  const pin = findPersonalGlobePinByEventId(event.id);
  const coords = resolveEventGlobeCoords(event);
  const startIso = plan?.windowStartIso?.trim() || event.datetime?.trim() || pin?.createdAtIso || null;
  const endIso = plan?.windowEndIso?.trim() || null;
  const startMs = parseMs(startIso);
  const endMs = parseMs(endIso);
  const nowMs = now.getTime();
  const { photoCount, videoCount } = countEventMedia(event);

  return {
    eventId: event.id,
    title: pin?.experienceTitle?.trim() || plan?.title?.trim() || event.title.trim() || "맥락",
    place: pin?.placeLabel?.trim() || plan?.place?.trim() || event.place?.trim() || coords.placeLabel,
    timing: classifyTiming(startMs, endMs, nowMs),
    startIso,
    endIso,
    dateLabel: formatPinDateLabel(startIso),
    rangeLabel: buildRangeLabel(startIso, endIso),
    photoCount: Math.max(photoCount, pin?.photoCount ?? 0),
    videoCount: Math.max(videoCount, pin?.videoCount ?? 0),
    manual:
      event.metadata?.globeManualContext === true ||
      event.metadata?.targetingSource === "globe_manual",
    lat: pin?.lat ?? coords.lat,
    lng: pin?.lng ?? coords.lng,
    sortMs: startMs ?? endMs ?? nowMs,
  };
}

export function listGlobeContextTimeline(
  events: readonly EventCandidate[],
  now = new Date(),
): GlobeContextTimeline {
  const entries = events
    .map((event) => projectEntry(event, now))
    .filter((row): row is GlobeContextTimelineEntry => row !== null);

  const future = entries
    .filter((row) => row.timing === "future")
    .sort((left, right) => left.sortMs - right.sortMs);
  const present = entries
    .filter((row) => row.timing === "present")
    .sort((left, right) => left.sortMs - right.sortMs);
  const past = entries
    .filter((row) => row.timing === "past")
    .sort((left, right) => right.sortMs - left.sortMs);

  return {
    future,
    present,
    past,
    total: entries.length,
  };
}
