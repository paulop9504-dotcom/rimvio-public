import type { EventCandidate } from "@/lib/events/event-candidate";
import { CONTEXT_MATCH_MIN_SCORE } from "@/lib/ingest/context-match-media-gate";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import { listGlobeContextTimeline } from "@/lib/globe/list-globe-context-timeline";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type AlbumSpacetimeCandidate = {
  capturedAtIso: string;
  lat: number | null;
  lng: number | null;
};

export type AlbumContextMatchResult = {
  matches: boolean;
  bestScore: number;
  eventId: string | null;
  eventTitle: string | null;
};

/** Pre-import gate — does native album metadata fit any globe context window? */
export function scoreAlbumItemAgainstGlobeContexts(input: {
  item: AlbumSpacetimeCandidate;
  events: readonly EventCandidate[];
  now?: Date;
  minScore?: number;
}): AlbumContextMatchResult {
  const minScore = input.minScore ?? CONTEXT_MATCH_MIN_SCORE;
  const timeline = listGlobeContextTimeline(input.events, input.now);
  const entries = [...timeline.future, ...timeline.present, ...timeline.past];

  let bestScore = 0;
  let eventId: string | null = null;
  let eventTitle: string | null = null;

  for (const entry of entries) {
    const event = input.events.find((row) => row.id === entry.eventId);
    if (!event) {
      continue;
    }
    const plan = readPlanContextFromEvent(event);
    const fit = scoreSpacetimeFit({
      capturedAtIso: input.item.capturedAtIso,
      lat: input.item.lat,
      lng: input.item.lng,
      eventStartIso: event.datetime!,
      eventEndIso: plan?.windowEndIso ?? null,
      eventPlace: plan?.place ?? event.place,
      capturedPlaceLabel: entry.place,
    });
    if (fit.score > bestScore) {
      bestScore = fit.score;
      eventId = event.id;
      eventTitle = entry.title;
    }
    if (fit.fits && fit.score >= minScore) {
      return {
        matches: true,
        bestScore: fit.score,
        eventId: event.id,
        eventTitle: entry.title,
      };
    }
  }

  return {
    matches: false,
    bestScore,
    eventId,
    eventTitle,
  };
}
