import type { EventCandidate } from "@/lib/events/event-candidate";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import {
  listGlobeContextTimeline,
  type GlobeContextTimelineEntry,
} from "@/lib/globe/list-globe-context-timeline";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type ActiveGlobeContextTier = "high" | "medium" | "low";

export type ActiveGlobeContextMatch = {
  eventId: string;
  title: string;
  place: string;
  score: number;
  tier: ActiveGlobeContextTier;
  signal: "spacetime" | "present" | "time" | "place";
  alternates: readonly string[];
};

const MIN_MEDIUM_SCORE = 0.42;
const MIN_HIGH_SCORE = 0.62;

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readEventPlaceAnchor(
  event: EventCandidate,
): { lat: number; lng: number } | null {
  const meta = event.metadata ?? {};
  const lat = readFiniteCoord(meta.globePlaceLat);
  const lng = readFiniteCoord(meta.globePlaceLng);
  if (lat !== null && lng !== null) {
    return { lat, lng };
  }
  return null;
}

function tierForScore(score: number): ActiveGlobeContextTier {
  if (score >= MIN_HIGH_SCORE) {
    return "high";
  }
  if (score >= MIN_MEDIUM_SCORE) {
    return "medium";
  }
  return "low";
}

function scoreEntry(input: {
  entry: GlobeContextTimelineEntry;
  event: EventCandidate;
  nowIso: string;
  lat: number | null;
  lng: number | null;
}): { score: number; signal: ActiveGlobeContextMatch["signal"] } {
  const plan = readPlanContextFromEvent(input.event);
  const anchor = readEventPlaceAnchor(input.event);
  const fit = scoreSpacetimeFit({
    capturedAtIso: input.nowIso,
    lat: input.lat,
    lng: input.lng,
    eventStartIso: input.entry.startIso ?? input.event.datetime ?? input.nowIso,
    eventEndIso: plan?.windowEndIso ?? input.entry.endIso,
    eventPlace: input.entry.place,
    eventLat: anchor?.lat ?? input.entry.lat,
    eventLng: anchor?.lng ?? input.entry.lng,
    capturedPlaceLabel: null,
  });

  let score = fit.score;
  let signal: ActiveGlobeContextMatch["signal"] = "time";

  if (input.entry.timing === "present") {
    score += 0.22;
    signal = "present";
  } else if (input.entry.timing === "future") {
    score += 0.08;
  } else {
    score -= 0.2;
  }

  if (fit.fits) {
    score += 0.18;
    signal = "spacetime";
  } else if (fit.placeOk && input.lat != null && input.lng != null) {
    score += 0.12;
    signal = "place";
  } else if (fit.timeOk) {
    signal = "time";
  }

  if (input.entry.timing === "present" && fit.timeOk) {
    signal = fit.placeOk ? "spacetime" : "present";
  }

  return { score, signal };
}

/** Best globe context for proactive resource chip — time · place · present window. */
export function resolveActiveGlobeContext(input: {
  events: readonly EventCandidate[];
  now?: Date;
  lat?: number | null;
  lng?: number | null;
}): ActiveGlobeContextMatch | null {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const timeline = listGlobeContextTimeline(input.events, now);
  const candidates = [...timeline.present, ...timeline.future].slice(0, 12);

  if (candidates.length === 0) {
    return null;
  }

  const eventsById = new Map(input.events.map((event) => [event.id, event]));
  const ranked = candidates
    .map((entry) => {
      const event = eventsById.get(entry.eventId);
      if (!event) {
        return null;
      }
      const { score, signal } = scoreEntry({ entry, event, nowIso, lat, lng });
      return {
        eventId: entry.eventId,
        title: entry.title,
        place: entry.place,
        score,
        tier: tierForScore(score),
        signal,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) => right.score - left.score);

  const top = ranked[0];
  if (!top || top.tier === "low") {
    return null;
  }

  return {
    ...top,
    alternates: ranked.slice(1, 3).filter((row) => row.tier !== "low").map((row) => row.eventId),
  };
}

export type ActiveGlobeContextOption = {
  eventId: string;
  title: string;
  place: string;
  score: number;
  tier: ActiveGlobeContextTier;
};

/** Ranked proactive contexts — for carousel context switcher. */
export function resolveRankedActiveGlobeContexts(input: {
  events: readonly EventCandidate[];
  now?: Date;
  lat?: number | null;
  lng?: number | null;
  limit?: number;
}): ActiveGlobeContextOption[] {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const timeline = listGlobeContextTimeline(input.events, now);
  const candidates = [...timeline.present, ...timeline.future].slice(0, 12);
  const eventsById = new Map(input.events.map((event) => [event.id, event]));

  return candidates
    .map((entry) => {
      const event = eventsById.get(entry.eventId);
      if (!event) {
        return null;
      }
      const { score } = scoreEntry({ entry, event, nowIso, lat, lng });
      const tier = tierForScore(score);
      if (tier === "low") {
        return null;
      }
      return {
        eventId: entry.eventId,
        title: entry.title,
        place: entry.place,
        score,
        tier,
      };
    })
    .filter((row): row is ActiveGlobeContextOption => row !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit ?? 3);
}
