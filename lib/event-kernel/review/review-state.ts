import type { OcrExtractedEvent } from "@/lib/events/ocr-event-extraction-types";
import { registerPendingEventCandidates } from "@/lib/event-kernel/review/pending-event-candidate-store";

export type ReviewStateType =
  | "NONE"
  | "PENDING_EVENT_REVIEW"
  | "EVENTS_APPROVED"
  | "EVENTS_REJECTED";

export type EventReviewState = {
  type: ReviewStateType;
  candidateIds: string[];
  createdAt: string;
};

const DEFAULT_SCOPE = "default";

let reviewByScope = new Map<string, EventReviewState>();

function emptyReviewState(): EventReviewState {
  return {
    type: "NONE",
    candidateIds: [],
    createdAt: new Date(0).toISOString(),
  };
}

export function resetReviewStateForTests(scopeId = DEFAULT_SCOPE) {
  reviewByScope = new Map();
  reviewByScope.set(scopeId, emptyReviewState());
}

export function getReviewState(scopeId = DEFAULT_SCOPE): EventReviewState {
  return reviewByScope.get(scopeId) ?? emptyReviewState();
}

export function setReviewState(
  state: EventReviewState,
  scopeId = DEFAULT_SCOPE
): void {
  reviewByScope.set(scopeId, state);
}

export function clearReviewState(scopeId = DEFAULT_SCOPE): void {
  reviewByScope.set(scopeId, emptyReviewState());
}

export function isPendingEventReview(scopeId = DEFAULT_SCOPE): boolean {
  return getReviewState(scopeId).type === "PENDING_EVENT_REVIEW";
}

/** Register OCR candidates and enter review state. */
export function beginPendingEventReview(input: {
  events: OcrExtractedEvent[];
  scopeId?: string;
  now?: string;
}): EventReviewState {
  const scopeId = input.scopeId ?? DEFAULT_SCOPE;
  const candidateIds = registerPendingEventCandidates(input.events, scopeId);
  const state: EventReviewState = {
    type: "PENDING_EVENT_REVIEW",
    candidateIds,
    createdAt: input.now ?? new Date().toISOString(),
  };
  setReviewState(state, scopeId);
  return state;
}

export function markReviewApproved(scopeId = DEFAULT_SCOPE): EventReviewState {
  const prior = getReviewState(scopeId);
  const next: EventReviewState = {
    ...prior,
    type: "EVENTS_APPROVED",
  };
  setReviewState(next, scopeId);
  return next;
}

export function markReviewRejected(scopeId = DEFAULT_SCOPE): EventReviewState {
  const prior = getReviewState(scopeId);
  const next: EventReviewState = {
    ...prior,
    type: "EVENTS_REJECTED",
  };
  setReviewState(next, scopeId);
  return next;
}
