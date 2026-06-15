"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildPinClusterFromEvent,
  buildPinClusterFromPersonalPin,
} from "@/lib/globe/build-pin-cluster-from-event";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { findLifeEventCandidate } from "@/lib/life-read-model";

/** Resolve a fly-to-ready pin cluster for any globe context event id. */
export function resolveGlobeContextPinCluster(
  eventId: string | null | undefined,
): PinCluster | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }

  let event: EventCandidate | null = findLifeEventCandidate(key);
  if (!event) {
    event = recoverGlobeContextEventFromPin(key);
  }

  const pin = findPersonalGlobePinByEventId(key);
  if (event) {
    return buildPinClusterFromEvent(event, pin);
  }
  if (pin) {
    return buildPinClusterFromPersonalPin(pin);
  }

  return null;
}
