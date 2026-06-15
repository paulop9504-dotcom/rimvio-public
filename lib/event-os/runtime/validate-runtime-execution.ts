import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { EventOsStateSnapshot } from "@/lib/event-os/causal-trace-types";
import type { UiEmitFromProof } from "@/lib/event-os/runtime/event-os-runtime-types";

export function validateRuntimeExecution(input: {
  lockHeld: boolean;
  replayAnchor: EventOsStateSnapshot;
  proof: CausalProof;
  uiEmit: UiEmitFromProof;
}): string[] {
  const failures: string[] = [];

  if (!input.lockHeld) {
    failures.push("execution_without_lock");
  }

  if (!input.replayAnchor) {
    failures.push("snapshot_missing");
  }

  if (
    input.proof.stateBefore.reviewState !== input.replayAnchor.reviewState ||
    input.proof.stateBefore.scheduledEventCount !==
      input.replayAnchor.scheduledEventCount
  ) {
    failures.push("snapshot_mismatch_stateBefore");
  }

  if (!input.proof.proofHash?.length) {
    failures.push("proof_missing");
  }

  if (input.proof.commitDecision === "EXECUTED" && !input.proof.ssotDelta.changed) {
    failures.push("commit_without_ssot_delta");
  }

  if (input.uiEmit.proofHash !== input.proof.proofHash) {
    failures.push("ui_update_without_proof");
  }

  if (input.uiEmit.uiDiff !== input.proof.uiDiff) {
    failures.push("ui_diff_mismatch_proof");
  }

  return failures;
}
