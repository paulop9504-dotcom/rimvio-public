import { eventOSOrchestrator } from "@/lib/event-os/runtime/event-os-orchestrator";
import type { ReviewExecutionProcessResult } from "@/lib/event-os/review-execution-types";
import type { EventOSRuntimeProcessResult } from "@/lib/event-os/runtime/event-os-runtime-types";

export { reviewExecutionInputFromMessage } from "@/lib/event-os/runtime/event-os-orchestrator";

function toLegacyProcessResult(
  runtime: EventOSRuntimeProcessResult
): ReviewExecutionProcessResult {
  return {
    processed: runtime.processed.map((step) => ({
      input: step.input,
      proof: step.proof,
      orchestrator: step.orchestrator,
      ok: step.ok,
      error: step.error,
    })),
    remaining: runtime.remaining,
  };
}

/** queue → EventOSOrchestrator.drain (runtime kernel loop) */
export function drainReviewExecutionQueue(input?: {
  scopeId?: string;
}): ReviewExecutionProcessResult & {
  executionGraph: EventOSRuntimeProcessResult["executionGraph"];
  runtime: EventOSRuntimeProcessResult;
} {
  const runtime = eventOSOrchestrator.drain(input);
  return {
    ...toLegacyProcessResult(runtime),
    executionGraph: runtime.executionGraph,
    runtime,
  };
}

export const reviewExecutionOrchestrator = {
  processQueue: drainReviewExecutionQueue,
  processOne: (job: Parameters<typeof eventOSOrchestrator.execute>[0]) =>
    eventOSOrchestrator.execute(job),
};
