import type { ContextHubServiceId } from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { ApiProviderId } from "@/lib/globe/resource/api-wakeup-types";

/** Hub service row → external sync provider (null = no JIT fetch). */
export function resolveApiProviderForHubResource(
  sourceHubId: ContextHubServiceId,
): ApiProviderId | null {
  switch (sourceHubId) {
    case "ticket":
      return "ticket_ingest";
    case "flight":
      return "flight_status";
    case "lodging":
      return "places_lodging";
    default:
      return null;
  }
}
