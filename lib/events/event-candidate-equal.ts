import type { EventCandidate } from "@/lib/events/event-candidate";

/** Skip localStorage write + EVENT_CANDIDATES_UPDATED when upsert is a no-op. */
export function eventCandidateContentEqual(
  left: EventCandidate,
  right: EventCandidate,
): boolean {
  try {
    return (
      JSON.stringify(stripVolatileEventFields(left)) ===
      JSON.stringify(stripVolatileEventFields(right))
    );
  } catch {
    return false;
  }
}

function stripVolatileEventFields(event: EventCandidate): Omit<EventCandidate, "updatedAt"> {
  const { updatedAt: _updatedAt, ...rest } = event;
  return rest;
}
