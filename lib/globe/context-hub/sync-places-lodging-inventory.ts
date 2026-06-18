import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import { commitLodgingInventoryToEvent } from "@/lib/globe/context-hub/commit-lodging-inventory";
import { isLodgingHubEnabled } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { loadLodgingInventoryRows } from "@/lib/globe/context-hub/load-lodging-inventory-rows";
import {
  shouldPreferUserLocationForLodgingSync,
} from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";

/** JIT refresh — Places Nearby when configured, mock fallback otherwise. */
export async function syncPlacesLodgingInventory(input: {
  contextEventId: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<EventCandidate | null> {
  const event = findEventCandidate(input.contextEventId.trim());
  if (!event || !isLodgingHubEnabled(event)) {
    return null;
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
