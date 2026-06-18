import type { EventCandidate } from "@/lib/events/event-candidate";

/** In-memory lookup — no event-store read. */
export function createEventResolver(
  events: readonly EventCandidate[],
): (id: string) => EventCandidate | null {
  const byId = new Map(events.map((e) => [e.id, e]));
  return (id: string) => byId.get(id) ?? null;
}
