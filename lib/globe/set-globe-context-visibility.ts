"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  GLOBE_CONTEXT_VISIBILITY_EXTERNAL,
  GLOBE_CONTEXT_VISIBILITY_PRIVATE,
  type GlobeContextVisibility,
} from "@/lib/globe/globe-context-visibility";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { readPinScopeFromMetadata } from "@/lib/globe/stamp-universal-pin-metadata";
import { stampUniversalPinMetadata } from "@/lib/globe/stamp-universal-pin-metadata";
import { globeTraceCellKey } from "@/lib/globe/globe-trace-cell";
import { PIN_DOMAIN_SHIP_PHASE } from "@/lib/globe/pin-domain-registry";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export function readGlobeContextVisibility(
  event: EventCandidate | null | undefined,
): GlobeContextVisibility {
  const raw = event?.metadata?.globeContextVisibility;
  if (raw === GLOBE_CONTEXT_VISIBILITY_EXTERNAL) {
    return GLOBE_CONTEXT_VISIBILITY_EXTERNAL;
  }
  return GLOBE_CONTEXT_VISIBILITY_PRIVATE;
}

export function isGlobeContextExternal(
  event: EventCandidate | null | undefined,
): boolean {
  return readGlobeContextVisibility(event) === GLOBE_CONTEXT_VISIBILITY_EXTERNAL;
}

export type SetGlobeContextVisibilityResult = {
  event: EventCandidate;
  visibility: GlobeContextVisibility;
  pioneerCell: string | null;
};

/** Toggle personal trace discoverability — P2+ experience + external only. */
export function setGlobeContextVisibility(input: {
  eventId: string;
  external: boolean;
}): SetGlobeContextVisibilityResult {
  if (PIN_DOMAIN_SHIP_PHASE < 2) {
    throw new Error("external_scope_locked");
  }

  const event = findLifeEventCandidate(input.eventId.trim());
  if (!event) {
    throw new Error("event_not_found");
  }

  const pin = findPersonalGlobePinByEventId(event.id);
  const scope = input.external ? "external" : "internal";
  const pioneerCell =
    input.external && pin
      ? globeTraceCellKey(pin.lat, pin.lng)
      : null;

  const metadata = stampUniversalPinMetadata({
    metadata: event.metadata,
    scope,
    domainId: "experience",
  });

  const nextMetadata = {
    ...metadata,
    ...(pioneerCell ? { globePioneerCell: pioneerCell } : {}),
  };

  const saved = commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: nextMetadata,
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
  });

  return {
    event: saved,
    visibility: readPinScopeFromMetadata(saved.metadata) === "external"
      ? GLOBE_CONTEXT_VISIBILITY_EXTERNAL
      : GLOBE_CONTEXT_VISIBILITY_PRIVATE,
    pioneerCell,
  };
}
