#!/usr/bin/env npx tsx
import { getReviewState } from "../lib/event-kernel/review/review-state";
import { simulateCounterfactual } from "../lib/event-os/simulate-counterfactual";
import {
  resetOcrReviewFlowForTests,
  setupOcrReviewFlow,
} from "../lib/event-os/ocr-review-flow-setup";
import { replayCausalProof } from "../lib/event-os/replay-causal-proof";
import {
  resetReviewExecutionLocksForTests,
  tryAcquireReviewExecutionLock,
} from "../lib/event-os/review-execution-lock";
import { findGoldenHash } from "../lib/event-os/golden-replay-hashes";
import { assertReplayMatchesGolden } from "../lib/event-os/replay-causal-proof";
import {
  traceApproveCandidate,
  traceConfirmCommit,
  traceSetCandidateDate,
} from "../lib/event-os/trace-event-os-interaction";
import { assertProofExpectations } from "../lib/event-os/validate-causal-trace";
import { runApproveStep } from "../lib/event-os/execution-steps";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

// --- Full OCR flow proofs ---
setupOcrReviewFlow();
const proofApprove = traceApproveCandidate({ message: "맞아" });
const approveCheck = assertProofExpectations(proofApprove, {
  validationResult: "MISSING_DATE",
  commitDecision: "BLOCKED",
  ssotChanged: false,
  uiDiff: "show DATE_PICKER",
});
if (approveCheck.length > 0) {
  fail(`approve_proof: ${approveCheck.join("; ")}`);
}

const replayApprove = replayCausalProof(proofApprove);
if (!replayApprove.ok) {
  fail(
    `replay_approve: ${replayApprove.mismatches.map((m) => m.field).join(", ")}`
  );
}

const patches = getReviewState().candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));
const proofDate = traceSetCandidateDate({ patches });
if (proofDate.commitDecision !== "PENDING_CONFIRM") {
  fail(`date_proof_commit:${proofDate.commitDecision}`);
}

// --- Counterfactual after date: would EXECUTE (before real commit) ---
const cfExecuted = simulateCounterfactual(proofDate, {
  action: "응",
  step: "confirm",
});
if (cfExecuted.simulated.commitDecision !== "EXECUTED") {
  fail(
    `counterfactual_confirm_dry:${cfExecuted.simulated.commitDecision}`
  );
}
if (cfExecuted.simulated.execution.dryRun !== true) {
  fail("counterfactual_must_be_dry_run");
}
if (cfExecuted.simulated.ssotDelta.changed) {
  fail("counterfactual_must_not_change_ssot");
}

const proofConfirm = traceConfirmCommit({ syncClient: false });
if (proofConfirm.commitDecision !== "EXECUTED") {
  fail(`confirm_proof_commit:${proofConfirm.commitDecision}`);
}

// --- Counterfactual: null date stays BLOCKED ---
resetOcrReviewFlowForTests();
setupOcrReviewFlow();
const cfBlocked = simulateCounterfactual(proofApprove, { action: "맞아" });
if (cfBlocked.simulated.commitDecision !== "BLOCKED") {
  fail(`counterfactual_null_date:${cfBlocked.simulated.commitDecision}`);
}

// --- Execution lock: concurrent acquire blocked ---
resetOcrReviewFlowForTests();
setupOcrReviewFlow();
const lock1 = tryAcquireReviewExecutionLock("default");
if (!lock1.acquired) {
  fail("lock_first_should_acquire");
}
const lock2 = tryAcquireReviewExecutionLock("default");
if (lock2.acquired) {
  fail("lock_second_should_block");
}
lock1.release();
resetReviewExecutionLocksForTests();
setupOcrReviewFlow();

const lockedStep = runApproveStep({ message: "맞아", scopeId: "default" });
if (lockedStep.proof.execution.blockedByLock) {
  fail("approve_after_lock_release_should_run");
}

for (const id of [
  "ocr_approve_missing_date",
  "ocr_date_resolved",
  "ocr_confirm_executed",
] as const) {
  const golden = findGoldenHash(id);
  const proof =
    id === "ocr_approve_missing_date"
      ? proofApprove
      : id === "ocr_date_resolved"
        ? proofDate
        : proofConfirm;
  if (golden && golden.length > 0) {
    const goldenFailures = assertReplayMatchesGolden(proof, golden);
    if (goldenFailures.length > 0) {
      fail(`golden_${id}: ${goldenFailures.join("; ")}`);
    }
  }
}

const report = {
  status: violations.length === 0 ? "PASS" : "FAIL",
  violations,
  goldenCandidates: {
    ocr_approve_missing_date: proofApprove.proofHash,
    ocr_date_resolved: proofDate.proofHash,
    ocr_confirm_executed: proofConfirm.proofHash,
  },
};

console.log(JSON.stringify(report, null, 2));

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-event-os-replay: ok");
