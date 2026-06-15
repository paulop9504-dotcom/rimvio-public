import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { applyOcrCalendarCommitToClient } from "@/lib/event-kernel/review/sync-ocr-commit-to-client";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { ReviewExecutionProcessResult } from "@/lib/event-os/review-execution-types";
import type { UiEmitFromProof } from "@/lib/event-os/runtime/event-os-runtime-types";

/** Apply server-authorized commit payloads to client cache (ingress only). */
export function applyReviewExecutionClientIngress(
  orchestrator: OrchestratorResult | null | undefined
): { syncedEvents: number; syncedReminders: number } {
  if (!orchestrator?.eventCandidateUpserts?.length) {
    return { syncedEvents: 0, syncedReminders: 0 };
  }
  return applyOcrCalendarCommitToClient({
    eventCandidateUpserts: orchestrator.eventCandidateUpserts,
    calendarEvents: orchestrator.metadata?.calendar_events as
      | import("@/lib/event-kernel/review/execute-approve-pending-events").CalendarEvent[]
      | undefined,
  });
}

export function orchestratorFromReviewProcess(
  result: ReviewExecutionProcessResult & {
    runtime?: { processed: Array<{ uiEmit?: UiEmitFromProof }> };
  }
): OrchestratorResult | null {
  const last = result.processed[result.processed.length - 1];
  return last?.orchestrator ?? null;
}

export function uiEmitFromReviewProcess(
  result: ReviewExecutionProcessResult & {
    runtime?: { processed: Array<{ uiEmit?: UiEmitFromProof }> };
  }
): UiEmitFromProof | null {
  const last = result.runtime?.processed[result.runtime.processed.length - 1];
  return last?.uiEmit ?? null;
}

export function proofFromReviewProcess(
  result: ReviewExecutionProcessResult & {
    runtime?: { processed: Array<{ proof?: CausalProof }> };
  }
): CausalProof | null {
  const runtimeLast = result.runtime?.processed[result.runtime.processed.length - 1];
  if (runtimeLast?.proof) {
    return runtimeLast.proof;
  }
  const last = result.processed[result.processed.length - 1];
  return last?.proof ?? null;
}
