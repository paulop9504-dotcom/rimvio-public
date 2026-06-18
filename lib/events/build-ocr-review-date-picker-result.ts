import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { ActionUiTriggerWire } from "@/lib/action-chat/action-oriented-prompt";
import type { PendingCandidateValidation } from "@/lib/event-kernel/review/validate-pending-event-candidate";
import type { PendingEventCandidate } from "@/lib/event-kernel/review/pending-event-candidate-store";

function missingDateCount(validations: readonly PendingCandidateValidation[]): number {
  return validations.filter((row) => row.blockedBy.includes("MISSING_DATE"))
    .length;
}

function buildSummary(
  validations: readonly PendingCandidateValidation[],
  candidates: readonly PendingEventCandidate[]
): string {
  const missingDates = missingDateCount(validations);
  const firstTitle =
    validations.find((row) => row.blockedBy.includes("MISSING_DATE"))
      ?.title ?? candidates[0]?.title ?? "일정";

  if (missingDates <= 1) {
    return `${firstTitle} 일정의 날짜가 필요합니다.\n\n날짜를 선택해주세요.`;
  }

  return `날짜가 필요한 일정이 ${missingDates}건 있습니다.\n\n날짜를 선택해주세요.`;
}

export function buildOcrReviewDatePickerOrchestratorResult(input: {
  candidates: readonly PendingEventCandidate[];
  validations: readonly PendingCandidateValidation[];
}): OrchestratorResult {
  const rows = input.validations
    .filter((row) => row.blockedBy.includes("MISSING_DATE"))
    .map((row) => {
      const candidate = input.candidates.find((c) => c.id === row.candidateId);
      return {
        candidateId: row.candidateId,
        title: row.title,
        time: row.time ?? candidate?.time ?? null,
      };
    });

  const uiTrigger: ActionUiTriggerWire = {
    type: "OCR_REVIEW_DATE_PICKER",
    rows,
  };

  return {
    summary: buildSummary(input.validations, input.candidates),
    actions: [],
    source: "rules",
    confidence: 0.93,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    uiTrigger,
    presentation: { mode: "ACTION" },
    metadata: {
      intent: "SCHEDULE",
      trust_level_adjustment: "NONE",
      ocr_review_validation: input.validations,
    },
    thought: `event_review · needs_date · ${rows.length} rows`,
    meta: {
      intent_type: "CONTINUE",
      requires_context_switch: false,
      approval_action: "APPROVE_PENDING_EVENTS",
      review_state: "PENDING_EVENT_REVIEW",
      execution_route: "EVENT_REVIEW_DATE_PICKER",
      approval_detected: true,
      commit_ok: false,
      validation_blocked: true,
    },
  };
}
