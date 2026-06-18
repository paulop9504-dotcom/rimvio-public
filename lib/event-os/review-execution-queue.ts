import { drainReviewExecutionQueue } from "@/lib/event-os/review-execution-orchestrator";
import {
  getReviewExecutionQueueSnapshot,
  pushReviewExecution,
} from "@/lib/event-os/review-execution-queue-state";
import type {
  ReviewExecutionInput,
  ReviewExecutionProcessResult,
} from "@/lib/event-os/review-execution-types";

export {
  getReviewExecutionQueueSnapshot,
  pushReviewExecution,
  resetReviewExecutionQueueForTests,
  shiftReviewExecution,
} from "@/lib/event-os/review-execution-queue-state";

/**
 * Event OS ingress gate — replayable input only.
 * enqueue → drainReviewExecutionQueue (lock → step → CausalProof)
 */
export function enqueueReviewExecution(
  input: ReviewExecutionInput
): ReviewExecutionProcessResult {
  pushReviewExecution(input);
  return drainReviewExecutionQueue({ scopeId: input.scopeId });
}
