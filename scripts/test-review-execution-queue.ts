#!/usr/bin/env npx tsx
import { resetActionProjectionCacheForTests } from "../lib/action-projection/action-projection-cache";
import { getReviewState } from "../lib/event-kernel/review/review-state";
import { enqueueReviewExecution } from "../lib/event-os/review-execution-queue";
import {
  getReviewExecutionQueueSnapshot,
  resetReviewExecutionQueueForTests,
} from "../lib/event-os/review-execution-queue-state";
import { resetReviewExecutionLocksForTests } from "../lib/event-os/review-execution-lock";
import { orchestrateViaReviewExecutionQueue } from "../lib/event-os/resolve-review-execution-orchestrator";
import { setupOcrReviewFlow } from "../lib/event-os/ocr-review-flow-setup";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

resetReviewExecutionQueueForTests();
resetReviewExecutionLocksForTests();
resetActionProjectionCacheForTests();
setupOcrReviewFlow();

const viaResolver = orchestrateViaReviewExecutionQueue({ message: "맞아" });
if (!viaResolver) {
  fail("resolver_returned_null");
} else if (
  viaResolver.uiTrigger?.type !== "OCR_REVIEW_DATE_PICKER" &&
  viaResolver.meta?.execution_route !== "EVENT_REVIEW_DATE_PICKER"
) {
  fail(`resolver_approve_route:${viaResolver.meta?.execution_route}`);
}

const approve = enqueueReviewExecution({
  scopeId: "default",
  type: "approve",
  payload: { message: "맞아" },
});

if (approve.processed.length !== 1) {
  fail(`approve_processed:${approve.processed.length}`);
}
if (!approve.processed[0]?.proof) {
  fail("approve_proof_missing");
}
if (approve.processed[0]?.proof.commitDecision !== "BLOCKED") {
  fail(`approve_should_block:${approve.processed[0]?.proof.commitDecision}`);
}
if (getReviewExecutionQueueSnapshot().length > 0) {
  fail("queue_not_drained");
}

const patches = getReviewState().candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));

const date = enqueueReviewExecution({
  scopeId: "default",
  type: "date",
  payload: { patches },
});

if (date.processed[0]?.proof.commitDecision !== "PENDING_CONFIRM") {
  fail(`date_commit:${date.processed[0]?.proof.commitDecision}`);
}

const confirm = enqueueReviewExecution({
  scopeId: "default",
  type: "confirm",
  payload: { message: "응" },
});

if (confirm.processed[0]?.proof.commitDecision !== "EXECUTED") {
  fail(`confirm_commit:${confirm.processed[0]?.proof.commitDecision}`);
}

console.log(
  JSON.stringify(
    {
      status: violations.length === 0 ? "PASS" : "FAIL",
      violations,
      proofHashes: {
        approve: approve.processed[0]?.proof.proofHash,
        date: date.processed[0]?.proof.proofHash,
        confirm: confirm.processed[0]?.proof.proofHash,
      },
    },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-review-execution-queue: ok");
