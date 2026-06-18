import type { EventCandidate } from "@/lib/events/event-candidate";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export function resolveContextPlaceLabel(event: EventCandidate): string {
  const pin = findPersonalGlobePinByEventId(event.id);
  const plan = readPlanContextFromEvent(event);
  return (
    pin?.placeLabel?.trim() ||
    plan?.place?.trim() ||
    event.place?.trim() ||
    event.title.trim()
  );
}
