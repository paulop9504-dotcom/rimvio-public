import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type {
  ReviewExecutionInput,
  ReviewExecutionProcessResult,
} from "@/lib/event-os/review-execution-types";

import type { EventOSRuntimeProcessResult } from "@/lib/event-os/runtime/event-os-runtime-types";

export type ReviewExecutionClientResponse = ReviewExecutionProcessResult & {
  ok: boolean;
  orchestrator?: OrchestratorResult | null;
  executionGraph?: EventOSRuntimeProcessResult["executionGraph"];
  runtime?: EventOSRuntimeProcessResult;
};

/**
 * UI ingress gate — enqueue replayable input; never mutate SSOT from components.
 */
export async function submitReviewExecution(
  input: ReviewExecutionInput
): Promise<ReviewExecutionClientResponse> {
  const response = await fetch("/api/event-os/review-execution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "enqueue_and_process", input }),
  });

  if (!response.ok) {
    throw new Error("review_execution_failed");
  }

  return (await response.json()) as ReviewExecutionClientResponse;
}

export async function submitReviewExecutionMessage(input: {
  message: string;
  scopeId?: string;
}): Promise<ReviewExecutionClientResponse> {
  const response = await fetch("/api/event-os/review-execution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      scopeId: input.scopeId ?? "default",
    }),
  });

  if (!response.ok) {
    throw new Error("review_execution_failed");
  }

  const payload = (await response.json()) as ReviewExecutionClientResponse & {
    orchestrator?: OrchestratorResult | null;
  };

  return {
    ok: payload.ok,
    processed: payload.processed ?? [],
    remaining: payload.remaining ?? [],
    orchestrator: payload.orchestrator ?? null,
  };
}
