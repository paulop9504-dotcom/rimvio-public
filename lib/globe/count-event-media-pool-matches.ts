import type { EventCandidate } from "@/lib/events/event-candidate";
import { listEventMediaPoolMatches } from "@/lib/globe/passive-context/list-event-media-pool-matches";

/** Staged pool items that spacetime-fit this context (exclude already attached). */
export function countEventMediaPoolMatches(event: EventCandidate): number {
  return listEventMediaPoolMatches(event).length;
}

