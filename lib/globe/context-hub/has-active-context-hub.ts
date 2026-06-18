import type { EventCandidate } from "@/lib/events/event-candidate";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";

/** Context has at least one user-connected hub service (excludes ambient ai_search handoff). */
export function hasActiveContextHub(
  event: EventCandidate | null | undefined,
): boolean {
  const panel = listContextHubServicesForEvent(event);
  if (!panel) {
    return false;
  }
  return panel.services.some(
    (row) => row.connected && row.serviceId !== "ai_search",
  );
}
