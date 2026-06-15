import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import {
  runApproveStep,
  runConfirmStep,
  runDateStep,
} from "@/lib/event-os/execution-steps";
import { resetReviewExecutionLocksForTests } from "@/lib/event-os/review-execution-lock";
import { assertProofExpectations } from "@/lib/event-os/validate-causal-trace";

export type ReplayMismatch = {
  field: string;
  expected: unknown;
  actual: unknown;
};

export type ReplayResult = {
  ok: boolean;
  mismatches: ReplayMismatch[];
  replayed: CausalProof;
  originalHash: string;
  replayedHash: string;
};

function compareProof(original: CausalProof, replayed: CausalProof): ReplayMismatch[] {
  const mismatches: ReplayMismatch[] = [];

  const checks: Array<[string, unknown, unknown]> = [
    ["commitDecision", original.commitDecision, replayed.commitDecision],
    [
      "validationResult",
      original.validationProof.result,
      replayed.validationProof.result,
    ],
    ["uiDiff", original.uiDiff, replayed.uiDiff],
    ["ssotDelta.changed", original.ssotDelta.changed, replayed.ssotDelta.changed],
    [
      "projectionDelta.impact",
      original.projectionDelta.impact,
      replayed.projectionDelta.impact,
    ],
    [
      "scheduledEventDelta",
      original.stateDiff.scheduledEventDelta,
      replayed.stateDiff.scheduledEventDelta,
    ],
  ];

  for (const [field, expected, actual] of checks) {
    if (expected !== actual) {
      mismatches.push({ field, expected, actual });
    }
  }

  return mismatches;
}

/** Re-execute a single step from a frozen proof input (caller must reset SSOT first). */
export function replayCausalProofStep(
  proof: CausalProof,
  options?: { syncClient?: boolean }
): CausalProof {
  const scopeId = proof.input.scopeId;
  const now = new Date(proof.input.clockIso);

  switch (proof.input.step) {
    case "approve":
      return runApproveStep({
        message: proof.input.action,
        scopeId,
        now,
      }).proof;
    case "date":
      return runDateStep({
        patches: proof.input.patches ?? [],
        scopeId,
        now,
      }).proof;
    case "confirm":
      return runConfirmStep({
        message: proof.input.action,
        scopeId,
        now,
        syncClient: options?.syncClient ?? proof.input.syncClient,
      }).proof;
    default:
      return runApproveStep({ message: proof.input.action, scopeId, now }).proof;
  }
}

export function replayCausalProof(
  proof: CausalProof,
  options?: { syncClient?: boolean }
): ReplayResult {
  resetReviewExecutionLocksForTests();
  const replayed = replayCausalProofStep(proof, options);
  const mismatches = compareProof(proof, replayed);
  return {
    ok: mismatches.length === 0,
    mismatches,
    replayed,
    originalHash: proof.proofHash,
    replayedHash: replayed.proofHash,
  };
}

export function assertReplayMatchesGolden(
  proof: CausalProof,
  goldenHash: string
): string[] {
  const failures = assertProofExpectations(proof, { proofHash: goldenHash });
  if (proof.proofHash !== goldenHash) {
    failures.push(`golden proofHash expected ${goldenHash} got ${proof.proofHash}`);
  }
  return failures;
}
