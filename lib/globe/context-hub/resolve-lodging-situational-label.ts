import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

/** Grouped map label while lodging focus card is open — not per-property names. */
export function resolveLodgingSituationalLabel(event: EventCandidate): string {
  const blob = `${event.title} ${event.place ?? ""} ${event.description ?? ""}`;
  if (/(?:출장|미팅|회의|meeting|business\s*trip|업무|보고|발표|사무실)/iu.test(blob)) {
    return copy.globe.lodgingSituationalBusiness;
  }
  const plan = readPlanContextFromEvent(event);
  if (event.category === "travel" || plan) {
    return copy.globe.lodgingSituationalTravel;
  }
  return copy.globe.lodgingSituationalStay;
}
