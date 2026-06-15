import type { EventCandidate } from "@/lib/events/event-candidate";
import type { SpacetimeFeedTargetMatch } from "@/lib/feed/feed-capture-types";
import { findPlanEventForPeerThread } from "@/lib/plan-context/find-plan-event-for-peer-thread";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { resolveSpacetimeFeedTarget } from "@/lib/feed/resolve-spacetime-feed-target";
import { resolveTargetEventFromSpacetime } from "@/lib/feed/resolve-target-event-from-spacetime";
import { parseIsoMs, scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import { listEventCandidates } from "@/lib/events/event-store";
import type { SearchCaptureIngestResult } from "@/lib/feed/ingest-search-capture";

/** Minimum spacetime score to attach without explicit user confirm. */
export const CONTEXT_MATCH_MIN_SCORE = 0.62;
export const CONTEXT_MATCH_HIGH_SCORE = 0.82;

export type ContextMatchSignal =
  | "user_confirm"
  | "plan_peer"
  | "spacetime"
  | "user_intent"
  | "none";

export type ContextMatchMediaDecision = {
  allow: boolean;
  confidence: "high" | "medium" | "low" | "none";
  reason: string;
  signal: ContextMatchSignal;
  match: SpacetimeFeedTargetMatch | null;
  targetEventId: string | null;
  wouldCreateMoment: boolean;
};

export type MediaContextIngestOutcome =
  | { status: "attached"; result: SearchCaptureIngestResult; decision: ContextMatchMediaDecision }
  | { status: "skipped"; decision: ContextMatchMediaDecision };

function captureInPlanWindow(
  event: EventCandidate,
  capturedAtIso: string,
): boolean {
  const plan = readPlanContextFromEvent(event);
  const capMs = parseIsoMs(capturedAtIso);
  const startMs = parseIsoMs(plan?.windowStartIso ?? event.datetime);
  const endMs = parseIsoMs(plan?.windowEndIso ?? null);
  if (capMs === null || startMs === null) {
    return true;
  }
  const endBound = endMs ?? startMs + 14 * 86_400_000;
  return capMs >= startMs - 86_400_000 && capMs <= endBound + 86_400_000;
}

function confidenceFromScore(score: number): ContextMatchMediaDecision["confidence"] {
  if (score >= CONTEXT_MATCH_HIGH_SCORE) {
    return "high";
  }
  if (score >= CONTEXT_MATCH_MIN_SCORE) {
    return "medium";
  }
  if (score > 0) {
    return "low";
  }
  return "none";
}

function deny(
  reason: string,
  partial: Partial<ContextMatchMediaDecision> = {},
): ContextMatchMediaDecision {
  return {
    allow: false,
    confidence: "none",
    reason,
    signal: "none",
    match: null,
    targetEventId: null,
    wouldCreateMoment: partial.wouldCreateMoment ?? false,
    ...partial,
  };
}

function allowDecision(input: {
  reason: string;
  signal: ContextMatchSignal;
  match: SpacetimeFeedTargetMatch | null;
  targetEventId: string | null;
  wouldCreateMoment: boolean;
  score?: number;
}): ContextMatchMediaDecision {
  const score = input.score ?? input.match?.score ?? CONTEXT_MATCH_MIN_SCORE;
  return {
    allow: true,
    confidence: confidenceFromScore(score),
    reason: input.reason,
    signal: input.signal,
    match: input.match,
    targetEventId: input.targetEventId,
    wouldCreateMoment: input.wouldCreateMoment,
  };
}

/**
 * Rimvio ingest law — attach media only when context matches an experience.
 * Rejects orphan moment drafts (convenience store, commute, unrelated shots).
 */
export function evaluateContextMatchMedia(input: {
  context: MediaSpacetimeContext;
  peerThreadId?: string | null;
  memoText?: string | null;
  events?: readonly EventCandidate[];
  userConfirmedTarget?: boolean;
}): ContextMatchMediaDecision {
  if (input.userConfirmedTarget) {
    return allowDecision({
      reason: "사용자가 경험을 확인했어요",
      signal: "user_confirm",
      match: null,
      targetEventId: null,
      wouldCreateMoment: false,
      score: 1,
    });
  }

  const events = input.events ?? listEventCandidates();
  const threadId = input.peerThreadId?.trim();
  const resolved = resolveTargetEventFromSpacetime({
    capturedAtIso: input.context.capturedAtIso,
    lat: input.context.lat,
    lng: input.context.lng,
    placeLabel: input.context.placeLabel,
    memoText: input.memoText,
    peerThreadId: threadId,
    events,
  });

  const wouldCreateMoment = resolved.createdNewEvent;

  if (threadId) {
    const planEvent = findPlanEventForPeerThread(events, threadId);
    if (planEvent && captureInPlanWindow(planEvent, input.context.capturedAtIso)) {
      const plan = readPlanContextFromEvent(planEvent);
      const fit = scoreSpacetimeFit({
        capturedAtIso: input.context.capturedAtIso,
        lat: input.context.lat,
        lng: input.context.lng,
        eventStartIso: planEvent.datetime!,
        eventEndIso: plan?.windowEndIso ?? null,
        eventPlace: plan?.place ?? planEvent.place,
        capturedPlaceLabel: input.context.placeLabel,
      });
      return allowDecision({
        reason: `${planEvent.title} ROOM 맥락`,
        signal: "plan_peer",
        match: resolved.match ?? {
          eventId: planEvent.id,
          eventTitle: planEvent.title,
          confidence: fit.fits ? "high" : "medium",
          score: Math.max(fit.score, CONTEXT_MATCH_MIN_SCORE),
          placeLabel: plan?.place ?? planEvent.place ?? input.context.placeLabel,
          dayLabel: null,
          reason: planEvent.title,
        },
        targetEventId: planEvent.id,
        wouldCreateMoment: false,
        score: Math.max(fit.score, CONTEXT_MATCH_MIN_SCORE),
      });
    }
  }

  const match = resolveSpacetimeFeedTarget({
    capturedAtIso: input.context.capturedAtIso,
    lat: input.context.lat,
    lng: input.context.lng,
    placeLabel: input.context.placeLabel,
    memoText: input.memoText,
    events,
  });

  if (match && match.score >= CONTEXT_MATCH_MIN_SCORE && match.confidence !== "low") {
    return allowDecision({
      reason: match.reason,
      signal: "spacetime",
      match,
      targetEventId: match.eventId,
      wouldCreateMoment: false,
      score: match.score,
    });
  }

  const userIntent =
    input.context.origin === "search_capture" || input.context.origin === "feed_capture";
  if (userIntent && match && match.confidence !== "low") {
    return allowDecision({
      reason: `검색 맥락 · ${match.reason}`,
      signal: "user_intent",
      match,
      targetEventId: match.eventId,
      wouldCreateMoment: false,
      score: match.score,
    });
  }

  if (input.context.origin === "other") {
    if (match && match.score >= CONTEXT_MATCH_MIN_SCORE) {
      return allowDecision({
        reason: match.reason,
        signal: "spacetime",
        match,
        targetEventId: match.eventId,
        wouldCreateMoment: false,
        score: match.score,
      });
    }
    return deny("맥락에 맞는 경험이 없어요", { wouldCreateMoment });
  }

  if (wouldCreateMoment) {
    const weakTime =
      input.context.resolveSource === "file_mtime" ||
      input.context.resolveSource === "now";
    const noPlace =
      !input.context.placeLabel?.trim() &&
      input.context.lat === null &&
      input.context.lng === null;
    if (weakTime && noPlace) {
      return deny("일상 사진 — 경험 맥락 없음", { wouldCreateMoment: true });
    }
    return deny("새 경험을 만들기엔 맥락이 약해요", { wouldCreateMoment: true });
  }

  if (match && match.confidence === "low") {
    return deny("맥락 신뢰도가 낮아요", {
      match,
      targetEventId: match.eventId,
      wouldCreateMoment: false,
    });
  }

  return deny("맥락에 맞는 경험이 없어요", {
    match,
    targetEventId: resolved.event.id,
    wouldCreateMoment,
  });
}

export function skipMediaIngest(
  decision: ContextMatchMediaDecision,
): MediaContextIngestOutcome {
  return { status: "skipped", decision };
}

export function attachMediaIngest(
  result: SearchCaptureIngestResult,
  decision: ContextMatchMediaDecision,
): MediaContextIngestOutcome {
  return { status: "attached", result, decision };
}
