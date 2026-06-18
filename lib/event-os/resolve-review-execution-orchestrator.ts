import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { inferApprovalAction } from "@/lib/event-kernel/review/infer-approval-action";
import { loadPendingEventCandidates } from "@/lib/event-kernel/review/pending-event-candidate-store";
import { getReviewState } from "@/lib/event-kernel/review/review-state";
import { validatePendingEventCandidates } from "@/lib/event-kernel/review/validate-pending-event-candidate";
import { enqueueReviewExecution } from "@/lib/event-os/review-execution-queue";
import {
  reviewExecutionInputFromMessage,
} from "@/lib/event-os/review-execution-orchestrator";
import type { ReviewExecutionType } from "@/lib/event-os/review-execution-types";

function inferReviewStepType(scopeId: string): ReviewExecutionType {
  const review = getReviewState(scopeId);
  if (review.type !== "PENDING_EVENT_REVIEW" || review.candidateIds.length === 0) {
    return "approve";
  }
  const candidates = loadPendingEventCandidates(review.candidateIds, scopeId);
  const validations = validatePendingEventCandidates(candidates);
  if (validations.some((row) => row.blockedBy.includes("MISSING_DATE"))) {
    return "approve";
  }
  if (validations.length > 0 && validations.every((row) => row.status === "ready")) {
    return "confirm";
  }
  return "approve";
}

function lastOrchestrator(
  processed: ReturnType<typeof enqueueReviewExecution>["processed"]
): OrchestratorResult | null {
  const last = processed[processed.length - 1];
  return last?.orchestrator ?? null;
}

/**
 * Route OCR review actions through enqueue → processQueue (no direct orchestrate bypass).
 */
export function orchestrateViaReviewExecutionQueue(input: {
  message: string;
  scopeId?: string;
}): OrchestratorResult | null {
  const scopeId = input.scopeId ?? "default";
  const message = input.message.trim();
  if (!message) {
    return null;
  }

  const dateInput = reviewExecutionInputFromMessage({ message, scopeId });
  if (dateInput) {
    return lastOrchestrator(enqueueReviewExecution(dateInput));
  }

  if (!inferApprovalAction(message, scopeId)) {
    return null;
  }

  const stepType = inferReviewStepType(scopeId);
  const result = enqueueReviewExecution({
    scopeId,
    type: stepType,
    payload: { message },
  });
  const orchestrator = lastOrchestrator(result.processed);
  if (orchestrator) {
    return orchestrator;
  }
  if (stepType === "confirm") {
    return lastOrchestrator(
      enqueueReviewExecution({
        scopeId,
        type: "approve",
        payload: { message },
      })
    );
  }
  return null;
}
