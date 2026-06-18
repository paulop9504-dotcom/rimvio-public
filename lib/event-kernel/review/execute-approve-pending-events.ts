import {
  clearPendingEventCandidates,
  loadPendingEventCandidates,
} from "@/lib/event-kernel/review/pending-event-candidate-store";
import {
  getReviewState,
  markReviewApproved,
  markReviewRejected,
} from "@/lib/event-kernel/review/review-state";
import { commitOcrCandidateToEventStore } from "@/lib/event-kernel/review/commit-ocr-candidate-to-event-store";
import {
  validatePendingEventCandidate,
  type PendingCandidateValidation,
} from "@/lib/event-kernel/review/validate-pending-event-candidate";
import { scheduleLinkReminderAt } from "@/lib/local-links/reminders";
import { withReviewExecutionLock } from "@/lib/event-os/review-execution-lock";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  candidateId: string;
  eventCandidateId: string;
};

export type ApprovePendingEventsResult = {
  ok: boolean;
  events: CalendarEvent[];
  eventCandidateIds: string[];
  error?: string;
  validations?: PendingCandidateValidation[];
};

function validateCandidateIds(
  candidateIds: readonly string[],
  scopeId: string
): { valid: boolean; error?: string } {
  const review = getReviewState(scopeId);
  if (review.type !== "PENDING_EVENT_REVIEW") {
    return { valid: false, error: "no_pending_review" };
  }

  if (candidateIds.length === 0) {
    return { valid: false, error: "empty_candidates" };
  }

  const pendingSet = new Set(review.candidateIds);
  for (const id of candidateIds) {
    if (!pendingSet.has(id)) {
      return { valid: false, error: `unknown_candidate:${id}` };
    }
  }

  const loaded = loadPendingEventCandidates(candidateIds, scopeId);
  if (loaded.length !== candidateIds.length) {
    return { valid: false, error: "candidate_load_failed" };
  }

  return { valid: true };
}

function commitApprovedCandidate(
  candidate: ReturnType<typeof loadPendingEventCandidates>[number]
): CalendarEvent {
  const eventRecord = commitOcrCandidateToEventStore(candidate);

  const reminder = scheduleLinkReminderAt({
    linkId: `ocr-event-${candidate.id}`,
    title: candidate.title,
    url: "rimvio://calendar/ocr-review",
    fireAt: candidate.start,
  });

  return {
    id: reminder.id,
    title: candidate.title,
    start: candidate.start,
    end: candidate.end || candidate.start,
    candidateId: candidate.id,
    eventCandidateId: eventRecord.id,
  };
}

function executeApprovePendingEventsInner(input: {
  candidateIds: readonly string[];
  scopeId: string;
}): ApprovePendingEventsResult {
  const scopeId = input.scopeId;
  const validation = validateCandidateIds(input.candidateIds, scopeId);
  if (!validation.valid) {
    return { ok: false, events: [], eventCandidateIds: [], error: validation.error };
  }

  const candidates = loadPendingEventCandidates(input.candidateIds, scopeId);
  const validations = candidates.map(validatePendingEventCandidate);
  const blocked = validations.filter((row) => row.blockedBy.length > 0);
  if (blocked.length > 0) {
    return {
      ok: false,
      events: [],
      eventCandidateIds: [],
      error: "validation_blocked",
      validations,
    };
  }

  const events: CalendarEvent[] = [];
  const eventCandidateIds: string[] = [];

  try {
    for (const candidate of candidates) {
      const committed = commitApprovedCandidate(candidate);
      events.push(committed);
      eventCandidateIds.push(committed.eventCandidateId);
    }
  } catch (error) {
    return {
      ok: false,
      events: [],
      eventCandidateIds: [],
      error: error instanceof Error ? error.message : "commit_failed",
    };
  }

  markReviewApproved(scopeId);
  clearPendingEventCandidates(scopeId);

  return { ok: true, events, eventCandidateIds };
}

export function executeApprovePendingEvents(input: {
  candidateIds: readonly string[];
  scopeId?: string;
}): ApprovePendingEventsResult {
  const scopeId = input.scopeId ?? "default";
  const locked = withReviewExecutionLock(scopeId, () =>
    executeApprovePendingEventsInner({ ...input, scopeId })
  );
  if (!locked.ok) {
    return {
      ok: false,
      events: [],
      eventCandidateIds: [],
      error: locked.reason ?? "execution_locked",
    };
  }
  return locked.value;
}

export function executeRejectPendingEvents(scopeId = "default"): {
  ok: boolean;
} {
  const review = getReviewState(scopeId);
  if (review.type !== "PENDING_EVENT_REVIEW") {
    return { ok: false };
  }

  markReviewRejected(scopeId);
  clearPendingEventCandidates(scopeId);
  return { ok: true };
}
