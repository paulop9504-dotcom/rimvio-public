import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import { commitLodgingInventoryToEvent } from "@/lib/globe/context-hub/commit-lodging-inventory";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import { shouldPreferUserLocationForLodgingSync } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";

export type EnableLodgingHubInput = {
  contextEventId: string;
  lat?: number | null;
  lng?: number | null;
};

/** Enable lodging hub + seed inventory (Places when configured). */
export async function enableLodgingHubForContext(
  input: EnableLodgingHubInput,
): Promise<EventCandidate> {
  const event = findEventCandidate(input.contextEventId.trim());
  if (!event) {
    throw new Error("context_event_not_found");
  }

  const loaded = await loadLodgingInventoryRows({
    event,
    lat: input.lat,
    lng: input.lng,
    preferUserLocation: shouldPreferUserLocationForLodgingSync({
      event,
      lat: input.lat,
      lng: input.lng,
    }),
  });

  return commitLodgingInventoryToEvent({
    event,
    inventory: loaded.rows,
    inventorySource: loaded.source,
  });
}
