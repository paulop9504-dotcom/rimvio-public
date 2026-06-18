import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildSearchableExperienceIndex } from "@/lib/search/build-searchable-experience-index";
import type { RelatedContextHit } from "@/lib/search/search-related-context";
import { searchRelatedContext } from "@/lib/search/search-related-context";

const TRAVEL_SIGNAL =
  /(?:여행|출국|여정|관광|투어|trip|travel|vacation|holiday|독일|제주|부산|오사카|파리|런던|뉴욕)/iu;

export type TripPrepRecall = {
  hit: RelatedContextHit;
  recallLine: string;
  feedHref: string;
};

function buildRecallQuery(input: {
  title: string;
  place?: string;
  peerDisplayName?: string;
}): string | null {
  const parts = [
    input.place?.trim(),
    input.title.trim(),
    input.peerDisplayName?.trim(),
  ].filter(Boolean);

  const blob = parts.join(" ");
  if (!TRAVEL_SIGNAL.test(blob)) {
    return null;
  }

  const place = input.place?.trim();
  if (place) {
    return place;
  }

  const travelTerm = blob.match(TRAVEL_SIGNAL)?.[0];
  return travelTerm ?? null;
}

function formatRecallLine(hit: RelatedContextHit): string {
  const place = hit.place?.trim();
  const peer = hit.peerDisplayName?.trim();
  if (peer && place) {
    return `이전에 ${peer}랑 ${place} 여행이 있어요`;
  }
  if (place) {
    return `이전에 ${place} 여행이 있어요`;
  }
  return `비슷한 경험이 있어요 · ${hit.headline}`;
}

/** Plan · trip proximity — one related experience recall (projection read). */
export function resolveTripPrepRecall(input: {
  title: string;
  place?: string;
  peerDisplayName?: string;
  events: readonly EventCandidate[];
  excludeEventId?: string | null;
  now?: Date;
}): TripPrepRecall | null {
  const query = buildRecallQuery(input);
  if (!query) {
    return null;
  }

  const index = buildSearchableExperienceIndex(input.events, input.now ?? new Date());
  const hits = searchRelatedContext(index, query, 3).filter(
    (row) => row.eventId !== input.excludeEventId?.trim(),
  );
  const hit = hits[0];
  if (!hit) {
    return null;
  }

  return {
    hit,
    recallLine: formatRecallLine(hit),
    feedHref: `/feed?recallEvent=${encodeURIComponent(hit.eventId)}`,
  };
}
