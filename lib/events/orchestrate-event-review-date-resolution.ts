import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  applyPendingEventCandidateDatePatches,
  loadPendingEventCandidates,
} from "@/lib/event-kernel/review/pending-event-candidate-store";
import {
  formatResolutionConfirmLine,
  parseOcrReviewDatePayload,
} from "@/lib/event-kernel/review/pending-event-candidate-dates";
import { getReviewState } from "@/lib/event-kernel/review/review-state";
import { validatePendingEventCandidates } from "@/lib/event-kernel/review/validate-pending-event-candidate";
import { buildOcrReviewDatePickerOrchestratorResult } from "@/lib/events/build-ocr-review-date-picker-result";

function buildConfirmSummary(
  candidates: ReturnType<typeof loadPendingEventCandidates>
): string {
  const lines = candidates.map((row) => formatResolutionConfirmLine(row));
  return [...lines, "", "추가할까요?"].join("\n");
}

/**
 * Applies user-selected dates from OCR review date picker payload.
 */
export function orchestrateEventReviewDateResolution(input: {
  message: string;
  scopeId?: string;
}): OrchestratorResult | null {
  const scopeId = input.scopeId ?? "default";
  const review = getReviewState(scopeId);
  if (review.type !== "PENDING_EVENT_REVIEW") {
    return null;
  }

  const patches = parseOcrReviewDatePayload(input.message);
  if (!patches) {
    return null;
  }

  const pendingIds = new Set(review.candidateIds);
  for (const patch of patches) {
    if (!pendingIds.has(patch.candidateId)) {
      return null;
    }
  }

  applyPendingEventCandidateDatePatches(patches, scopeId);
  const candidates = loadPendingEventCandidates(review.candidateIds, scopeId);
  const validations = validatePendingEventCandidates(candidates);
  const stillBlocked = validations.filter((row) => row.blockedBy.length > 0);

  if (stillBlocked.length > 0) {
    return buildOcrReviewDatePickerOrchestratorResult({
      candidates,
      validations,
    });
  }

  return {
    summary: buildConfirmSummary(candidates),
    actions: [],
    source: "rules",
    confidence: 0.94,
    disclosure: "medium",
    actionsRevealed: false,
    pendingConfirm: true,
    presentation: { mode: "ACTION" },
    metadata: {
      intent: "SCHEDULE",
      trust_level_adjustment: "NONE",
    },
    thought: "event_review · dates_resolved · awaiting_approval",
    meta: {
      intent_type: "CONTINUE",
      requires_context_switch: false,
      review_state: "PENDING_EVENT_REVIEW",
      execution_route: "EVENT_REVIEW_DATE_CONFIRM",
      ready_for_approval: true,
    },
  };
}
