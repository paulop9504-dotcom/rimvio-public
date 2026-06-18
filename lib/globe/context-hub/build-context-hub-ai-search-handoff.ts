import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";

export type ContextHubAiSearchHandoff = {
  href: string;
  actionLabelKo: string;
  searchQuery: string;
};

function resolveContextSearchQuery(event: EventCandidate): string {
  const pin = findPersonalGlobePinByEventId(event.id);
  const plan = readPlanContextFromEvent(event);
  const place =
    pin?.placeLabel?.trim() ||
    plan?.place?.trim() ||
    event.place?.trim() ||
    "";
  const title = event.title.trim();
  if (place && title && !title.includes(place)) {
    return `${place} ${title}`;
  }
  return place || title || "맥락";
}

/** Context-bound search ingress — opens Search tab with related-context Q&A primed. */
export function buildContextHubAiSearchHandoff(
  event: EventCandidate,
): ContextHubAiSearchHandoff {
  const searchQuery = resolveContextSearchQuery(event);
  const params = new URLSearchParams({
    contextEventId: event.id,
    q: searchQuery,
  });
  return {
    href: `/search?${params.toString()}`,
    actionLabelKo: "맥락 검색",
    searchQuery,
  };
}
