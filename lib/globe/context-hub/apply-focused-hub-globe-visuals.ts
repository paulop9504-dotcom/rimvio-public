import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readTripLegFromEvent } from "@/lib/globe/trip-leg-metadata";

export type HubOneHopPair = {
  departureEventId: string;
  destinationEventId: string;
  tripRef: string;
};

/** Direct departure ↔ destination pair for the focused hubbed context. */
export function resolveHubOneHopPair(input: {
  focusedEventId: string | null | undefined;
  eventsById: ReadonlyMap<string, EventCandidate>;
}): HubOneHopPair | null {
  const eventId = input.focusedEventId?.trim();
  if (!eventId) {
    return null;
  }

  const event = input.eventsById.get(eventId);
  const leg = readTripLegFromEvent(event);
  if (!leg?.linkedEventId) {
    return null;
  }

  const linked = input.eventsById.get(leg.linkedEventId);
  const linkedLeg = readTripLegFromEvent(linked);
  if (!linked || linkedLeg?.tripRef !== leg.tripRef) {
    return null;
  }

  const departureEventId =
    leg.leg === "departure" ? eventId : leg.linkedEventId;
  const destinationEventId =
    leg.leg === "destination" ? eventId : leg.linkedEventId;

  return {
    departureEventId,
    destinationEventId,
    tripRef: leg.tripRef,
  };
}

/** Mute every pin except the 1-hop hub pair when a hubbed context is selected. */
export function applyFocusedHubGlobePins(
  pins: readonly ClassifiedGlobePin[],
  input: {
    focusedEventId: string | null | undefined;
    eventsById: ReadonlyMap<string, EventCandidate>;
  },
): ClassifiedGlobePin[] {
  const pair = resolveHubOneHopPair({
    focusedEventId: input.focusedEventId,
    eventsById: input.eventsById,
  });
  if (!pair) {
    return [...pins];
  }

  const keep = new Set([pair.departureEventId, pair.destinationEventId]);

  return pins.map((pin) => {
    if (pin.pinShape === "viewer" || pin.pinShape === "cluster") {
      return pin;
    }

    const eventId = pin.sourceEventId?.trim();
    if (!eventId || !keep.has(eventId)) {
      return {
        ...pin,
        emphasis: "related" as const,
        hubFocusMuted: true,
      };
    }

    return {
      ...pin,
      emphasis: "primary" as const,
      hubFocusMuted: false,
    };
  });
}
