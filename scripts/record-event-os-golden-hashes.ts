#!/usr/bin/env npx tsx
/**
 * Record regression + proof hashes for GOLDEN_HASH_REGISTRY_V1.
 * Paste output into lib/event-os/graph-versioning/golden-hash-registry.ts
 */
import { getReviewState } from "../lib/event-kernel/review/review-state";
import { computeRegressionHash } from "../lib/event-os/graph-versioning/compute-regression-hash";
import { inferScenarioId } from "../lib/event-os/graph-versioning/infer-scenario-id";
import {
  resetOcrReviewFlowForTests,
  setupOcrReviewFlow,
} from "../lib/event-os/ocr-review-flow-setup";
import {
  traceApproveCandidate,
  traceConfirmCommit,
  traceSetCandidateDate,
} from "../lib/event-os/trace-event-os-interaction";

resetOcrReviewFlowForTests();
setupOcrReviewFlow();

const proofApprove = traceApproveCandidate({ message: "맞아" });
const patches = getReviewState().candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));
const proofDate = traceSetCandidateDate({ patches });
const proofConfirm = traceConfirmCommit({ syncClient: false });

const rows = [proofApprove, proofDate, proofConfirm].map((proof) => ({
  scenarioId: inferScenarioId(proof),
  proofHash: proof.proofHash,
  expectedHash: computeRegressionHash(proof),
  step: proof.input.step,
  uiDiff: proof.uiDiff,
  commitDecision: proof.commitDecision,
}));

console.log(JSON.stringify({ recordedAt: new Date().toISOString(), rows }, null, 2));
