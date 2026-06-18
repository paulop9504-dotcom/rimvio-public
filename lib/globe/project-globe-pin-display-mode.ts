import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { scoreSpacetimeFit, haversineKm, parseIsoMs } from "@/lib/feed/spacetime-fit";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const RECENT_MS = 14 * 24 * 60 * 60 * 1000;
const NEAR_KM = 120;

export type GlobePinDisplayShape = "dot" | "slot";

export type GlobePinDisplayReason =
  | "viewer"
  | "cluster"
  | "expanded_tap"
  | "focused_context"
  | "trip_destination"
  | "recent_near"
  | "recent_scheduled"
  | "lodging_focus_collapsed"
  | "hub_muted"
  | "stale_completed"
  | "stale_archived"
  | "no_event"
  | "unrelated";

export type GlobePinDisplayDecision = {
  shape: GlobePinDisplayShape;
  reason: GlobePinDisplayReason;
};

function readEventStartMs(event: EventCandidate): number {
  const plan = readPlanContextFromEvent(event);
  return (
    parseIsoMs(plan?.windowStartIso) ??
    parseIsoMs(event.datetime) ??
    parseIsoMs(event.updatedAt) ??
    0
  );
}

function isRelevantLifecycle(lifecycle: EventCandidate["lifecycle"]): boolean {
  return (
    lifecycle === "active" ||
    lifecycle === "scheduled" ||
    lifecycle === "confirmed" ||
    lifecycle === "candidate"
  );
}

/** Deterministic relevance — why a pin is dot vs slot (testable, no LLM). */
export function inferGlobePinDisplayDecision(input: {
  pin: ClassifiedGlobePin;
  event: EventCandidate | null;
  focusedEventId: string | null;
  expandedPinId: string | null;
  lodgingFocusStageOpen: boolean;
  viewerLat: number | null;
  viewerLng: number | null;
  nowMs: number;
}): GlobePinDisplayDecision {
  const { pin } = input;

  if (pin.pinShape === "viewer") {
    return { shape: "slot", reason: "viewer" };
  }
  if (pin.pinShape === "cluster") {
    return { shape: "slot", reason: "cluster" };
  }

  if (pin.id === input.expandedPinId) {
    return { shape: "slot", reason: "expanded_tap" };
  }

  const eventId = pin.sourceEventId?.trim() ?? "";
  if (input.lodgingFocusStageOpen) {
    return { shape: "dot", reason: "lodging_focus_collapsed" };
  }

  if (pin.hubFocusMuted) {
    return { shape: "dot", reason: "hub_muted" };
  }

  if (eventId && eventId === input.focusedEventId) {
    return { shape: "slot", reason: "focused_context" };
  }

  if (pin.emphasis === "primary" && pin.tripLeg === "destination") {
    return { shape: "slot", reason: "trip_destination" };
  }

  const event = input.event;
  if (!event) {
    return { shape: "dot", reason: "no_event" };
  }

  if (!isRelevantLifecycle(event.lifecycle)) {
    if (event.lifecycle === "archived") {
      return { shape: "dot", reason: "stale_archived" };
    }
    return { shape: "dot", reason: "stale_completed" };
  }

  const startMs = readEventStartMs(event);
  if (startMs > 0 && input.nowMs - startMs > RECENT_MS && eventId !== input.focusedEventId) {
    const endMs = parseIsoMs(readPlanContextFromEvent(event)?.windowEndIso);
    if (endMs != null && endMs < input.nowMs) {
      return { shape: "dot", reason: "stale_completed" };
    }
    if (event.lifecycle === "completed" || event.lifecycle === "archived") {
      return { shape: "dot", reason: "stale_archived" };
    }
  }

  if (input.viewerLat != null && input.viewerLng != null) {
    const fit = scoreSpacetimeFit({
      capturedAtIso: new Date(input.nowMs).toISOString(),
      lat: input.viewerLat,
      lng: input.viewerLng,
      eventStartIso: event.datetime ?? null,
      eventEndIso: readPlanContextFromEvent(event)?.windowEndIso ?? null,
      eventPlace: event.place,
      eventLat: pin.lat,
      eventLng: pin.lng,
      capturedPlaceLabel: null,
    });
    if (fit.placeOk || haversineKm(input.viewerLat, input.viewerLng, pin.lat, pin.lng) <= NEAR_KM) {
      if (isRelevantLifecycle(event.lifecycle)) {
        return { shape: "slot", reason: "recent_near" };
      }
    }
  }

  if (isRelevantLifecycle(event.lifecycle) && startMs > input.nowMs - RECENT_MS) {
    return { shape: "slot", reason: "recent_scheduled" };
  }

  return { shape: "dot", reason: "unrelated" };
}

function applyPinDisplayDecision(
  pin: ClassifiedGlobePin,
  decision: GlobePinDisplayDecision,
): ClassifiedGlobePin {
  if (decision.shape === "slot") {
    if (pin.pinShape === "slot" && pin.slot) {
      return pin;
    }
    return {
      ...pin,
      pinShape: "slot",
      slot: pin.slot ?? {
        experienceTitle: pin.label,
        photoCount: 0,
        videoCount: 0,
      },
    };
  }

  return {
    ...pin,
    pinShape: "dot",
    slot: undefined,
  };
}

/** Collapse stale / unrelated context pins to dots — tap expands to slot card. */
export function projectGlobePinDisplayMode(input: {
  pins: readonly ClassifiedGlobePin[];
  eventsById: ReadonlyMap<string, EventCandidate>;
  focusedEventId?: string | null;
  expandedPinId?: string | null;
  lodgingFocusStageOpen?: boolean;
  viewerLat?: number | null;
  viewerLng?: number | null;
  now?: Date;
}): ClassifiedGlobePin[] {
  const focusedEventId = input.focusedEventId?.trim() || null;
  const expandedPinId = input.expandedPinId?.trim() || null;
  const lodgingFocusStageOpen = input.lodgingFocusStageOpen === true;
  const viewerLat = input.viewerLat ?? null;
  const viewerLng = input.viewerLng ?? null;
  const nowMs = (input.now ?? new Date()).getTime();

  return input.pins.map((pin) => {
    const eventId = pin.sourceEventId?.trim() ?? "";
    const event = eventId ? input.eventsById.get(eventId) ?? null : null;
    const decision = inferGlobePinDisplayDecision({
      pin,
      event,
      focusedEventId,
      expandedPinId,
      lodgingFocusStageOpen,
      viewerLat,
      viewerLng,
      nowMs,
    });
    return applyPinDisplayDecision(pin, decision);
  });
}
