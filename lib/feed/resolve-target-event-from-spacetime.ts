import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildMomentEventDraft } from "@/lib/feed/bootstrap-spacetime-target";
import type { SpacetimeFeedTargetMatch } from "@/lib/feed/feed-capture-types";
import { resolveSpacetimeFeedTarget } from "@/lib/feed/resolve-spacetime-feed-target";
import { listEventCandidates } from "@/lib/events/event-store";
import { findPlanEventForPeerThreadAt } from "@/lib/plan-context/find-plan-event-for-peer-thread";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export function resolveTargetEventFromSpacetime(input: {
  capturedAtIso: string;
  lat: number | null;
  lng: number | null;
  placeLabel: string | null;
  memoText?: string | null;
  peerThreadId?: string | null;
  events?: readonly EventCandidate[];
}): {
  event: EventCandidate;
  match: SpacetimeFeedTargetMatch | null;
  createdNewEvent: boolean;
} {
  const events = input.events ?? listEventCandidates();

  const threadId = input.peerThreadId?.trim();
  if (threadId) {
    const planEvent = findPlanEventForPeerThreadAt(events, {
      peerThreadId: threadId,
      capturedAtIso: input.capturedAtIso,
    });
    if (planEvent) {
      const plan = readPlanContextFromEvent(planEvent);
      return {
        event: planEvent,
        match: {
          eventId: planEvent.id,
          eventTitle: planEvent.title,
          confidence: "high",
          score: 0.92,
          placeLabel: plan?.place ?? planEvent.place ?? input.placeLabel ?? null,
          dayLabel: null,
          reason: planEvent.title,
        },
        createdNewEvent: false,
      };
    }
  }

  const match = resolveSpacetimeFeedTarget({
    capturedAtIso: input.capturedAtIso,
    lat: input.lat,
    lng: input.lng,
    placeLabel: input.placeLabel,
    memoText: input.memoText,
    events,
  });

  if (match) {
    const existing = events.find((event) => event.id === match.eventId);
    if (existing) {
      return { event: existing, match, createdNewEvent: false };
    }
  }

  const draft = buildMomentEventDraft({
    capturedAtIso: input.capturedAtIso,
    placeLabel: input.placeLabel,
    memoText: input.memoText,
  });
  return { event: draft, match: null, createdNewEvent: true };
}
