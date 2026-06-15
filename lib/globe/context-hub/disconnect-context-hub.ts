import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import {
  readContextHubIds,
  readContextHubParentEventId,
} from "@/lib/globe/context-hub/context-hub-metadata";
import { deleteGlobeContext } from "@/lib/globe/delete-globe-context";
import {
  LINKED_EVENT_ID_META_KEY,
  TRIP_LEG_META_KEY,
  TRIP_REF_META_KEY,
} from "@/lib/globe/trip-leg-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type DisconnectContextHubResult = {
  contextEvent: EventCandidate | null;
  hubEventId: string;
  removed: boolean;
};

function stripTripLegMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...metadata,
    [TRIP_REF_META_KEY]: undefined,
    [TRIP_LEG_META_KEY]: undefined,
    [LINKED_EVENT_ID_META_KEY]: undefined,
    departureHubAirportIata: undefined,
    departureHubConnectedAtIso: undefined,
  };
}

/** Unplug a hub from its context — hides hub pin, keeps destination context. */
export function disconnectContextHub(input: {
  contextEventId: string;
  hubEventId: string;
}): DisconnectContextHubResult {
  const contextEventId = input.contextEventId.trim();
  const hubEventId = input.hubEventId.trim();
  const context = findEventCandidate(contextEventId);
  const hub = findEventCandidate(hubEventId);

  if (!context) {
    throw new Error("context_event_not_found");
  }
  if (!hub) {
    throw new Error("hub_event_not_found");
  }

  const parentId =
    readContextHubParentEventId(hub) ??
    (typeof hub.metadata?.departureHubDestinationEventId === "string"
      ? hub.metadata.departureHubDestinationEventId.trim()
      : null);

  if (parentId && parentId !== contextEventId) {
    throw new Error("hub_context_mismatch");
  }

  deleteGlobeContext(hubEventId);

  const remainingHubIds = readContextHubIds(context).filter((id) => id !== hubEventId);
  const linkedDepartureId =
    typeof context.metadata?.[LINKED_EVENT_ID_META_KEY] === "string"
      ? context.metadata[LINKED_EVENT_ID_META_KEY].trim()
      : "";
  const clearTripLeg = linkedDepartureId === hubEventId;
  const stamp = new Date().toISOString();

  const nextMetadata: Record<string, unknown> = {
    ...(context.metadata ?? {}),
    contextHubIds: remainingHubIds,
    contextHubUpdatedAtIso: stamp,
  };

  const contextEvent = commitEventUpsert({
    ...context,
    metadata: clearTripLeg
      ? stripTripLegMetadata(nextMetadata)
      : nextMetadata,
    lifecycleUpdatedAt: stamp,
  });

  return {
    contextEvent,
    hubEventId,
    removed: true,
  };
}
