import type { EventCandidate } from "@/lib/events/event-candidate";
import { collectEventPeople } from "@/lib/people-graph/collect-event-people";
import { personLabelsMatch } from "@/lib/people-graph/match-person-label";

/** null = all peers. */
export type GlobeContextPeopleFilter = string | null;

export function matchesGlobeContextPeopleFilter(
  eventId: string,
  peopleFilter: GlobeContextPeopleFilter,
  eventsById: ReadonlyMap<string, EventCandidate>,
): boolean {
  const peer = peopleFilter?.trim();
  if (!peer) {
    return true;
  }
  const event = eventsById.get(eventId.trim());
  if (!event) {
    return false;
  }
  return collectEventPeople(event).some((name) => personLabelsMatch(name, peer));
}
