#!/usr/bin/env npx tsx
import { getReviewState } from "../lib/event-kernel/review/review-state";
import { enqueueReviewExecution } from "../lib/event-os/review-execution-queue";
import { resetReviewExecutionQueueForTests } from "../lib/event-os/review-execution-queue-state";
import { resetReviewExecutionLocksForTests } from "../lib/event-os/review-execution-lock";
import { eventOSOrchestrator } from "../lib/event-os/runtime/event-os-orchestrator";
import {
  getExecutionGraph,
  getProofByHash,
  listPersistedProofHashes,
  resetProofPersistStoreForTests,
} from "../lib/event-os/runtime/proof-persist-store";
import { setupOcrReviewFlow } from "../lib/event-os/ocr-review-flow-setup";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

resetReviewExecutionLocksForTests();
resetReviewExecutionQueueForTests();
resetProofPersistStoreForTests();
eventOSOrchestrator.resetRuntimeCountersForTests();
setupOcrReviewFlow();

const flow = enqueueReviewExecution({
  scopeId: "default",
  type: "approve",
  payload: { message: "맞아" },
});

const step = flow.runtime?.processed[0];
if (!step) {
  fail("no_runtime_step");
} else {
  if (!step.lockHeld) {
    fail("lock_not_held");
  }
  if (step.runtimeViolations.length > 0) {
    fail(`runtime_violations:${step.runtimeViolations.join(",")}`);
  }
  if (!step.uiEmit?.proofHash) {
    fail("ui_emit_missing_proof_hash");
  }
  if (step.uiEmit.proofHash !== step.proof.proofHash) {
    fail("ui_emit_proof_mismatch");
  }
  if (!getProofByHash(step.proof.proofHash)) {
    fail("proof_not_persisted");
  }
}

const patches = getReviewState().candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));

const dateFlow = enqueueReviewExecution({
  scopeId: "default",
  type: "date",
  payload: { patches },
});

const confirmFlow = enqueueReviewExecution({
  scopeId: "default",
  type: "confirm",
  payload: { message: "응" },
});

const graph = getExecutionGraph("default");
if (graph.length < 3) {
  fail(`execution_graph_len:${graph.length}`);
}

const hashes = listPersistedProofHashes("default");
if (hashes.length < 3) {
  fail(`persisted_proofs:${hashes.length}`);
}

if (confirmFlow.runtime?.processed[0]?.proof.commitDecision !== "EXECUTED") {
  fail("confirm_not_executed");
}

console.log(
  JSON.stringify(
    {
      status: violations.length === 0 ? "PASS" : "FAIL",
      violations,
      graph,
      proofHashes: hashes,
    },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-event-os-runtime-orchestrator: ok");
