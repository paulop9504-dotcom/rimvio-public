import { OCR_REVIEW_DATES_PREFIX } from "@/lib/event-kernel/review/pending-event-candidate-dates";
import type { ReviewDatePayload } from "@/lib/event-os/review-execution-types";
import {
  getReviewExecutionQueueSnapshot,
  shiftReviewExecution,
} from "@/lib/event-os/review-execution-queue-state";
import type {
  ReviewExecutionInput,
  ReviewExecutionStepResult,
} from "@/lib/event-os/review-execution-types";
import { withReviewExecutionLock } from "@/lib/event-os/review-execution-lock";
import { snapshotEventOsState } from "@/lib/event-os/snapshot-event-os-state";
import { executeReviewJob } from "@/lib/event-os/runtime/execute-review-job";
import { emitUiFromProof } from "@/lib/event-os/runtime/emit-ui-from-proof";
import type {
  EventOSRuntimeProcessResult,
  EventOSRuntimeStepResult,
  ExecutionGraphEntry,
} from "@/lib/event-os/runtime/event-os-runtime-types";
import { versionGraphFromProof } from "@/lib/event-os/graph-versioning";
import { persistProof } from "@/lib/event-os/runtime/proof-persist-store";
import { validateRuntimeExecution } from "@/lib/event-os/runtime/validate-runtime-execution";
import { buildCausalProof, validationProofFromRows } from "@/lib/event-os/build-causal-proof";

function buildLockBlockedStep(
  job: ReviewExecutionInput,
  reason: string
): EventOSRuntimeStepResult {
  const now = new Date();
  const replayAnchor = snapshotEventOsState(job.scopeId, now);
  const proof = buildCausalProof({
    input: {
      action: job.type === "date" ? "date_selected" : "맞아",
      step: job.type,
      scopeId: job.scopeId,
      clockIso: now.toISOString(),
    },
    plan: {
      triggeredFunction: "EventOSOrchestrator",
      triggeredChain: ["dequeue", "lock_failed"],
      intendedCommit: "BLOCKED",
    },
    execution: {
      dryRun: false,
      stepsExecuted: [],
      blockedByLock: true,
      lockReason: reason,
    },
    stateBefore: replayAnchor,
    stateAfter: replayAnchor,
    validationProof: validationProofFromRows([], "NONE"),
    commitDecision: "BLOCKED",
    uiDiff: "none",
    causalChain: [`Lock not acquired: ${reason}`],
    extraAnomalies: ["execution_locked"],
  });
  const uiEmit = emitUiFromProof(proof, null);
  persistProof(proof);
  versionGraphFromProof({ proof, parentProofHash: null });
  return {
    input: job,
    proof,
    orchestrator: null,
    ok: false,
    error: reason,
    uiEmit,
    replayAnchor,
    runtimeViolations: ["execution_without_lock"],
    lockHeld: false,
  };
}

/**
 * Event OS runtime kernel — queue consumer, lock, snapshot, step, proof, UI emit.
 */
export class EventOSOrchestrator {
  private sequence = 0;
  private lastProofHashByScope = new Map<string, string>();

  /** Single job: dequeue is caller responsibility. */
  execute(job: ReviewExecutionInput): EventOSRuntimeStepResult {
    const now = new Date(
      job.payload.clockIso ?? job.enqueuedAt ?? new Date().toISOString()
    );

    const locked = withReviewExecutionLock(job.scopeId, () => {
      const replayAnchor = snapshotEventOsState(job.scopeId, now);
      const outcome = executeReviewJob(job);
      const { proof, orchestrator } = outcome;
      const uiEmit = emitUiFromProof(proof, orchestrator);

      this.sequence += 1;
      const parentProofHash = this.lastProofHashByScope.get(job.scopeId);
      const graphEntry: ExecutionGraphEntry = {
        sequence: this.sequence,
        scopeId: job.scopeId,
        step: job.type,
        proofHash: proof.proofHash,
        parentProofHash,
        replayAnchorIso: now.toISOString(),
      };
      this.lastProofHashByScope.set(job.scopeId, proof.proofHash);

      persistProof(proof, graphEntry);

      versionGraphFromProof({
        proof,
        parentProofHash,
      });

      const runtimeViolations = validateRuntimeExecution({
        lockHeld: true,
        replayAnchor,
        proof,
        uiEmit,
      });

      return {
        input: job,
        proof,
        orchestrator,
        ok: runtimeViolations.length === 0 && !proof.execution.blockedByLock,
        uiEmit,
        replayAnchor,
        runtimeViolations,
        lockHeld: true,
        error:
          runtimeViolations.length > 0
            ? runtimeViolations.join(",")
            : undefined,
      } satisfies EventOSRuntimeStepResult;
    });

    if (!locked.ok) {
      return buildLockBlockedStep(job, locked.reason);
    }

    return locked.value;
  }

  /**
   * Runtime loop — drain queue until empty for optional scope filter.
   */
  drain(input?: { scopeId?: string }): EventOSRuntimeProcessResult {
    const processed: EventOSRuntimeStepResult[] = [];
    const executionGraph: ExecutionGraphEntry[] = [];

    for (;;) {
      const job = shiftReviewExecution(input?.scopeId);
      if (!job) {
        break;
      }
      const step = this.execute(job);
      processed.push(step);
      const entry = {
        sequence: processed.length,
        scopeId: job.scopeId,
        step: job.type,
        proofHash: step.proof.proofHash,
        parentProofHash:
          processed.length > 1
            ? processed[processed.length - 2]?.proof.proofHash
            : undefined,
        replayAnchorIso: step.replayAnchor.pendingCandidates[0]
          ? new Date().toISOString()
          : new Date(0).toISOString(),
      };
      executionGraph.push(entry);
    }

    return {
      processed,
      executionGraph,
      remaining: getReviewExecutionQueueSnapshot(),
    };
  }

  resetRuntimeCountersForTests(): void {
    this.sequence = 0;
    this.lastProofHashByScope.clear();
  }
}

export const eventOSOrchestrator = new EventOSOrchestrator();

export function reviewExecutionInputFromMessage(input: {
  message: string;
  scopeId?: string;
}): ReviewExecutionInput | null {
  const trimmed = input.message.trim();
  const scopeId = input.scopeId ?? "default";

  if (!trimmed.startsWith(OCR_REVIEW_DATES_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      trimmed.slice(OCR_REVIEW_DATES_PREFIX.length)
    ) as ReviewDatePayload;
    if (!Array.isArray(parsed.patches)) {
      return null;
    }
    return { scopeId, type: "date", payload: parsed };
  } catch {
    return null;
  }
}
