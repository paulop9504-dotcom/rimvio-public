import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  APPROVE_PENDING_EVENTS,
  inferApprovalAction,
  REJECT_PENDING_EVENTS,
} from "@/lib/event-kernel/review/infer-approval-action";
import {
  executeApprovePendingEvents,
  executeRejectPendingEvents,
} from "@/lib/event-kernel/review/execute-approve-pending-events";
import { loadPendingEventCandidates } from "@/lib/event-kernel/review/pending-event-candidate-store";
import { getReviewState } from "@/lib/event-kernel/review/review-state";
import { buildOcrReviewDatePickerOrchestratorResult } from "@/lib/events/build-ocr-review-date-picker-result";
import { buildEventCandidateUpsertsFromCommit } from "@/lib/event-kernel/review/sync-ocr-commit-to-client";

function formatCommittedSummary(count: number): string {
  if (count === 0) {
    return "등록할 일정이 없어요.";
  }
  if (count === 1) {
    return "일정 1건이 저장되었어요.";
  }
  return `일정 ${count}건이 저장되었어요.`;
}

/**
 * Pending OCR review → user approval / rejection (state-driven).
 * Returns null when review state or speech act does not apply.
 */
export function orchestrateEventReviewApproval(input: {
  message: string;
  scopeId?: string;
}): OrchestratorResult | null {
  const action = inferApprovalAction(input.message, input.scopeId);
  if (!action) {
    return null;
  }

  const review = getReviewState(input.scopeId);

  if (action === REJECT_PENDING_EVENTS) {
    executeRejectPendingEvents(input.scopeId);
    return {
      summary: "일정 후보는 캘린더에 넣지 않았어요. 다시 사진을 보내 주셔도 돼요.",
      actions: [],
      source: "rules",
      confidence: 0.92,
      disclosure: "none",
      actionsRevealed: false,
      pendingConfirm: false,
      presentation: { mode: "ACTION" },
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      thought: "event_review · rejected",
      meta: {
        intent_type: "CONTINUE",
        requires_context_switch: false,
        approval_action: REJECT_PENDING_EVENTS,
        review_state: "EVENTS_REJECTED",
        execution_route: "REVIEW_REJECT",
        approval_detected: true,
      },
    };
  }

  const commit = executeApprovePendingEvents({
    candidateIds: review.candidateIds,
    scopeId: input.scopeId,
  });

  if (!commit.ok && commit.error === "validation_blocked" && commit.validations) {
    const candidates = loadPendingEventCandidates(
      review.candidateIds,
      input.scopeId
    );
    return buildOcrReviewDatePickerOrchestratorResult({
      candidates,
      validations: commit.validations,
    });
  }

  if (!commit.ok) {
    return {
      summary: "일정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      actions: [],
      source: "rules",
      confidence: 0.7,
      disclosure: "medium",
      actionsRevealed: false,
      pendingConfirm: false,
      metadata: { intent: "SCHEDULE", trust_level_adjustment: "NONE" },
      thought: `event_review · commit_failed · ${commit.error ?? "unknown"}`,
      meta: {
        approval_action: APPROVE_PENDING_EVENTS,
        review_state: "PENDING_EVENT_REVIEW",
        execution_route: "CALENDAR_COMMIT",
        approval_detected: true,
        commit_ok: false,
      },
    };
  }

  const eventCandidateUpserts = buildEventCandidateUpsertsFromCommit(
    commit.eventCandidateIds
  );

  return {
    summary: formatCommittedSummary(commit.events.length),
    actions: [],
    source: "rules",
    confidence: 0.95,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "ACTION" },
    eventCandidateUpserts,
    metadata: {
      intent: "SCHEDULE",
      trust_level_adjustment: "NONE",
      calendar_events: commit.events,
      event_candidate_ids: commit.eventCandidateIds,
    },
    thought: `event_review · approved · ${commit.events.length} committed`,
    meta: {
      intent_type: "CONTINUE",
      requires_context_switch: false,
      approval_action: APPROVE_PENDING_EVENTS,
      review_state: "EVENTS_APPROVED",
      execution_route: "CALENDAR_COMMIT",
      approval_detected: true,
      calendar_commit_count: commit.events.length,
    },
  };
}
