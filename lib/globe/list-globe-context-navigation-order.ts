import type { EventCandidate } from "@/lib/events/event-candidate";
import { matchesGlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import type { GlobeContextPeopleFilter } from "@/lib/globe/globe-context-people-filter";
import {
  matchesGlobeContextTimeFilter,
  type GlobeContextTimeFilter,
} from "@/lib/globe/globe-context-time-filter";
import {
  listGlobeContextTimeline,
  type GlobeContextTimelineEntry,
} from "@/lib/globe/list-globe-context-timeline";
import { listLifeEventCandidates } from "@/lib/life-read-model";

function indexEventsById(
  events: readonly EventCandidate[],
): ReadonlyMap<string, EventCandidate> {
  return new Map(events.map((event) => [event.id, event]));
}

/** Filtered context order for vertical map swipe — future → present → past. */
export function listGlobeContextNavigationOrder(input?: {
  events?: readonly EventCandidate[];
  timeFilter?: GlobeContextTimeFilter;
  peopleFilter?: GlobeContextPeopleFilter;
  now?: Date;
}): GlobeContextTimelineEntry[] {
  const events = input?.events ?? listLifeEventCandidates();
  const timeline = listGlobeContextTimeline(events, input?.now);
  const eventsById = indexEventsById(events);
  const timeFilter = input?.timeFilter ?? "all";
  const peopleFilter = input?.peopleFilter ?? null;

  const rows = [
    ...timeline.future,
    ...timeline.present,
    ...timeline.past,
  ];

  return rows.filter(
    (row) =>
      matchesGlobeContextTimeFilter(row.startIso, timeFilter, input?.now) &&
      matchesGlobeContextPeopleFilter(row.eventId, peopleFilter, eventsById),
  );
}

export function resolveGlobeContextNavigationStep(input: {
  entries: readonly GlobeContextTimelineEntry[];
  currentEventId: string;
  direction: "next" | "prev";
}): GlobeContextTimelineEntry | null {
  const key = input.currentEventId.trim();
  if (!key || input.entries.length === 0) {
    return null;
  }
  const index = input.entries.findIndex((row) => row.eventId === key);
  if (index < 0) {
    return input.entries[0] ?? null;
  }
  const nextIndex =
    input.direction === "next"
      ? Math.min(input.entries.length - 1, index + 1)
      : Math.max(0, index - 1);
  if (nextIndex === index) {
    return null;
  }
  return input.entries[nextIndex] ?? null;
}
