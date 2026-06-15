#!/usr/bin/env npx tsx
import { getReviewState } from "../lib/event-kernel/review/review-state";
import { assertProofExpectations } from "../lib/event-os/validate-causal-trace";
import {
  traceApproveCandidate,
  traceConfirmCommit,
  traceDownstreamPropagation,
  traceSetCandidateDate,
} from "../lib/event-os/trace-event-os-interaction";
import { setupOcrReviewFlow } from "../lib/event-os/ocr-review-flow-setup";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

setupOcrReviewFlow();

const traceApprove = traceApproveCandidate({ message: "맞아" });
const approveFailures = assertProofExpectations(traceApprove, {
  validationResult: "MISSING_DATE",
  commitDecision: "BLOCKED",
  ssotChanged: false,
  projectionImpact: "none",
  uiDiff: "show DATE_PICKER",
});
if (approveFailures.length > 0) {
  fail(`3.1_approve: ${approveFailures.join("; ")}`);
}
if (traceApprove.stateBefore.pendingCandidates.some((row) => row.date !== null)) {
  fail("3.1_stateBefore_should_have_null_dates");
}
if (traceApprove.ssotDelta.changed) {
  fail("3.1_commit_must_not_touch_ssot");
}

const review = getReviewState();
const patches = review.candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));

const traceDate = traceSetCandidateDate({ patches });
const dateFailures = assertProofExpectations(traceDate, {
  validationResult: "RESOLVED",
  commitDecision: "PENDING_CONFIRM",
  ssotChanged: false,
  projectionImpact: "none",
  uiDiff: "show CONFIRM_SCREEN",
});
if (dateFailures.length > 0) {
  fail(`3.2_date: ${dateFailures.join("; ")}`);
}
if (traceDate.stateAfter.pendingCandidates.some((row) => !row.date)) {
  fail("3.2_dates_not_applied");
}

const traceCommit = traceConfirmCommit({ syncClient: true });
const commitFailures = assertProofExpectations(traceCommit, {
  validationResult: "PASS",
  commitDecision: "EXECUTED",
  ssotChanged: true,
  projectionImpact: "invalidate + recompute",
  uiDiff: "calendar_update + action_overlay",
});
if (commitFailures.length > 0) {
  fail(`3.3_confirm: ${commitFailures.join("; ")}`);
}

const downstream = traceDownstreamPropagation({ now: new Date("2026-06-03T11:00:00") });
if (!downstream.ok) {
  fail(`downstream: ${downstream.failures.join("; ")}`);
}

const report = {
  status: violations.length === 0 ? "PASS" : "FAIL",
  violations,
  proofHashes: {
    approve: traceApprove.proofHash,
    date: traceDate.proofHash,
    confirm: traceCommit.proofHash,
  },
  traces: {
    approve: traceApprove,
    dateSelected: traceDate,
    confirm: traceCommit,
  },
  downstreamChain: downstream.chain,
};

console.log(JSON.stringify(report, null, 2));

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-event-os-causal-trace: ok");
