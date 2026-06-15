import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { normalizeMeaningPerson } from "@/lib/meaning/meaning-node-id";

/** All participant labels on an event (plan + attendees). */
export function collectEventPeople(event: EventCandidate): string[] {
  const meta = event.metadata ?? {};
  const plan = readPlanContextFromEvent(event);
  const names = new Set<string>();

  const add = (value: string | null | undefined) => {
    const name = typeof value === "string" ? normalizeMeaningPerson(value) : "";
    if (name) {
      names.add(name);
    }
  };

  add(plan?.peerDisplayName);
  add(typeof meta.peerDisplayName === "string" ? meta.peerDisplayName : null);
  add(typeof meta.planPeerDisplayName === "string" ? meta.planPeerDisplayName : null);

  const attendees = meta.attendees;
  if (Array.isArray(attendees)) {
    for (const row of attendees) {
      if (typeof row === "string") {
        add(row);
      }
    }
  }

  return [...names];
}
