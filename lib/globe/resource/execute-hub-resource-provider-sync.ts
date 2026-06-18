import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ApiProviderId } from "@/lib/globe/resource/api-wakeup-types";
import { syncPlacesLodgingInventory } from "@/lib/globe/context-hub/sync-places-lodging-inventory";
import type { ContextResource } from "@/lib/globe/resource/types";

export type HubResourceSyncHandlerResult = {
  ok: boolean;
  skipped?: boolean;
  note?: string;
};

/** Provider-specific fetch — gated by ApiWakeupController. */
export async function executeHubResourceProviderSync(input: {
  providerId: ApiProviderId;
  event: EventCandidate;
  resource: ContextResource;
  lat?: number | null;
  lng?: number | null;
}): Promise<HubResourceSyncHandlerResult> {
  switch (input.providerId) {
    case "flight_status":
      if (input.resource.sourceHubId !== "flight" || !input.resource.action) {
        return { ok: false, skipped: true, note: "flight_not_connected" };
      }
      return { ok: true, note: "flight_status_stub" };

    case "ticket_ingest":
      if (input.resource.sourceHubId !== "ticket") {
        return { ok: false, skipped: true, note: "not_ticket" };
      }
      if (input.resource.action) {
        return { ok: true, note: "ticket_already_connected" };
      }
      return { ok: true, note: "ticket_ingest_stub" };

    case "places_lodging":
      if (
        input.resource.sourceHubId !== "lodging" &&
        input.resource.kind !== "lodging_voucher"
      ) {
        return { ok: false, skipped: true, note: "not_lodging" };
      }
      const refreshed = await syncPlacesLodgingInventory({
        contextEventId: input.event.id,
        lat: input.lat,
        lng: input.lng,
      });
      return refreshed
        ? { ok: true, note: "places_lodging_refreshed" }
        : { ok: false, skipped: true, note: "lodging_not_enabled" };

    default:
      return { ok: false, skipped: true, note: "provider_not_hub_synced" };
  }
}
