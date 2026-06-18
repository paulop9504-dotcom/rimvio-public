#!/usr/bin/env npx tsx
import { getReviewState } from "../lib/event-kernel/review/review-state";
import {
  assertNoSilentRegression,
  computeRegressionHash,
  detectRegression,
  getGraphVersionsForScope,
  getLatestGraphVersion,
  getLineageByProofHash,
  resetGraphVersionStoreForTests,
  versionGraphFromProof,
} from "../lib/event-os/graph-versioning";
import { setupOcrReviewFlow } from "../lib/event-os/ocr-review-flow-setup";
import { enqueueReviewExecution } from "../lib/event-os/review-execution-queue";
import { resetReviewExecutionQueueForTests } from "../lib/event-os/review-execution-queue-state";
import { resetReviewExecutionLocksForTests } from "../lib/event-os/review-execution-lock";
import { eventOSOrchestrator } from "../lib/event-os/runtime/event-os-orchestrator";
import { resetProofPersistStoreForTests } from "../lib/event-os/runtime/proof-persist-store";
import {
  traceApproveCandidate,
  traceConfirmCommit,
  traceSetCandidateDate,
} from "../lib/event-os/trace-event-os-interaction";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

resetGraphVersionStoreForTests();
resetReviewExecutionLocksForTests();
resetReviewExecutionQueueForTests();
resetProofPersistStoreForTests();
eventOSOrchestrator.resetRuntimeCountersForTests();
setupOcrReviewFlow();

const proofApprove = traceApproveCandidate({ message: "맞아" });
const v1 = versionGraphFromProof({ proof: proofApprove, parentProofHash: null });

if (v1.lineage.version !== 1) {
  fail(`v1_version:${v1.lineage.version}`);
}
if (!v1.version.hash) {
  fail("v1_hash_missing");
}
if (v1.graph.nodes.length !== 1) {
  fail(`v1_nodes:${v1.graph.nodes.length}`);
}

const patches = getReviewState().candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));
const proofDate = traceSetCandidateDate({ patches });
const v2 = versionGraphFromProof({
  proof: proofDate,
  parentProofHash: proofApprove.proofHash,
});

if (v2.lineage.parentId !== proofApprove.proofHash) {
  fail("v2_lineage_parent");
}
if (v2.graph.version !== "v2") {
  fail(`v2_graph_version:${v2.graph.version}`);
}
if (v2.graph.edges.length < 1) {
  fail("v2_edges_missing");
}

const proofConfirm = traceConfirmCommit({ syncClient: false });
const v3 = versionGraphFromProof({
  proof: proofConfirm,
  parentProofHash: proofDate.proofHash,
});

const scopeVersions = getGraphVersionsForScope("default");
if (scopeVersions.length < 3) {
  fail(`scope_versions:${scopeVersions.length}`);
}

const latest = getLatestGraphVersion("default");
if (latest?.proofHash !== proofConfirm.proofHash) {
  fail("latest_version_head");
}

const lineage3 = getLineageByProofHash(proofConfirm.proofHash);
if (!lineage3 || lineage3.version !== 3) {
  fail(`lineage3:${lineage3?.version}`);
}

for (const [scenarioId, proof] of [
  ["ocr_approve_missing_date", proofApprove],
  ["ocr_date_resolved", proofDate],
  ["ocr_confirm_executed", proofConfirm],
] as const) {
  const regression = detectRegression(proof, scenarioId);
  if (regression.actual !== computeRegressionHash(proof)) {
    fail(`regression_hash_compute:${scenarioId}`);
  }
  const silent = assertNoSilentRegression(regression);
  if (silent.length > 0) {
    fail(silent.join(";"));
  }
}

resetGraphVersionStoreForTests();
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

const orchProof = flow.runtime?.processed[0]?.proof;
if (!orchProof) {
  fail("orchestrator_proof_missing");
} else {
  const stored = getLineageByProofHash(orchProof.proofHash);
  if (!stored) {
    fail("orchestrator_lineage_not_stored");
  }
}

try {
  versionGraphFromProof({
    proof: proofApprove,
    parentProofHash: "deadbeef",
  });
  fail("should_reject_broken_lineage");
} catch (error) {
  const msg = error instanceof Error ? error.message : "";
  if (!msg.includes("lineage_parent_node_missing")) {
    fail(`broken_lineage_msg:${msg}`);
  }
}

console.log(
  JSON.stringify(
    {
      status: violations.length === 0 ? "PASS" : "FAIL",
      violations,
      graphVersions: scopeVersions.map((v) => v.versionId),
    },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-graph-versioning: ok");
