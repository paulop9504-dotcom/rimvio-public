import { snapshotEventOsState } from "@/lib/event-os/snapshot-event-os-state";
import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import { validateCausalProofContract } from "@/lib/event-os/audit/validate-causal-proof-contract";
import { compileCommandToEventOs } from "@/lib/command-os/compile-command-to-event-os";
import {
  resetCommandEventCandidatesForTests,
} from "@/lib/command-os/command-event-candidate-store";
import { enableDeterministicCommandIdsForTests } from "@/lib/command-os/command-event-candidate-store";
import {
  detectRegression,
  getGraphVersionsForScope,
  getLineageByProofHash,
  resetGraphVersionStoreForTests,
} from "@/lib/event-os/graph-versioning";
import {
  resetOcrReviewFlowForTests,
  setupOcrReviewFlow,
} from "@/lib/event-os/ocr-review-flow-setup";
import { enqueueReviewExecution } from "@/lib/event-os/review-execution-queue";
import { resetReviewExecutionQueueForTests } from "@/lib/event-os/review-execution-queue-state";
import {
  resetReviewExecutionLocksForTests,
  tryAcquireReviewExecutionLock,
} from "@/lib/event-os/review-execution-lock";
import { eventOSOrchestrator } from "@/lib/event-os/runtime/event-os-orchestrator";
import { resetProofPersistStoreForTests } from "@/lib/event-os/runtime/proof-persist-store";
import { replayCausalProof } from "@/lib/event-os/replay-causal-proof";
import { simulateCounterfactual } from "@/lib/event-os/simulate-counterfactual";
import {
  traceApproveCandidate,
  traceConfirmCommit,
  traceSetCandidateDate,
} from "@/lib/event-os/trace-event-os-interaction";
import { renderFromProof } from "@/lib/event-os/ui-binding";
import { validateProofUiBinding } from "@/lib/event-os/ui-binding/validate-proof-ui-binding";
import { getReviewState } from "@/lib/event-kernel/review/review-state";

export type AuditStageResult = {
  stage: string;
  pass: boolean;
  violations: string[];
  details?: Record<string, unknown>;
};

export type EventOsIntegrationAuditReport = {
  status: "PASS" | "FAIL";
  stages: AuditStageResult[];
  e2e: {
    commandProofHash?: string;
    flowProofHashes: Record<string, string>;
    graphVersions: string[];
  };
  violations: string[];
};

function stage(
  name: string,
  violations: string[],
  details?: Record<string, unknown>
): AuditStageResult {
  return {
    stage: name,
    pass: violations.length === 0,
    violations,
    details,
  };
}

function prepareStateForReplayStep(proof: CausalProof): void {
  resetOcrReviewFlowForTests();
  setupOcrReviewFlow();
  const patches = () =>
    getReviewState().candidateIds.map((candidateId) => ({
      candidateId,
      date: "2026-06-03",
    }));

  if (proof.input.step === "date") {
    traceApproveCandidate({ message: "맞아", scopeId: proof.input.scopeId });
  }
  if (proof.input.step === "confirm") {
    traceApproveCandidate({ message: "맞아", scopeId: proof.input.scopeId });
    traceSetCandidateDate({
      patches: proof.input.patches ?? patches(),
      scopeId: proof.input.scopeId,
    });
  }
}

function auditReplay(proofs: CausalProof[]): string[] {
  const failures: string[] = [];
  for (const proof of proofs) {
    prepareStateForReplayStep(proof);
    const replay = replayCausalProof(proof);
    if (!replay.ok) {
      failures.push(
        `replay_${proof.input.step}:${replay.mismatches.map((m) => m.field).join(",")}`
      );
    }
    if (replay.replayedHash !== replay.originalHash) {
      failures.push(`replay_hash_${proof.input.step}`);
    }
    if (replay.replayed.proofHash !== proof.proofHash) {
      failures.push(`replay_proof_hash_${proof.input.step}`);
    }
  }
  return failures;
}

/** Canonical OCR proofs for replay/golden (deterministic clocks, matches registry). */
function buildCanonicalOcrProofs(): {
  approve: CausalProof;
  date: CausalProof;
  confirm: CausalProof;
} {
  resetOcrReviewFlowForTests();
  setupOcrReviewFlow();
  const approve = traceApproveCandidate({ message: "맞아" });
  const patches = getReviewState().candidateIds.map((candidateId) => ({
    candidateId,
    date: "2026-06-03",
  }));
  const date = traceSetCandidateDate({ patches });
  const confirm = traceConfirmCommit({ syncClient: false });
  return { approve, date, confirm };
}

function auditLockQueue(scopeId: string): string[] {
  const failures: string[] = [];
  resetReviewExecutionLocksForTests();
  resetReviewExecutionQueueForTests();
  setupOcrReviewFlow();

  const first = tryAcquireReviewExecutionLock(scopeId);
  if (!first.acquired) {
    failures.push("lock_first_acquire_failed");
  }

  const second = tryAcquireReviewExecutionLock(scopeId);
  if (second.acquired) {
    failures.push("lock_double_acquire_allowed");
  }

  const blockedWhileLocked = enqueueReviewExecution({
    scopeId,
    type: "approve",
    payload: { message: "맞아" },
  });
  const blockedProof = blockedWhileLocked.runtime?.processed[0]?.proof;
  if (!blockedProof?.execution.blockedByLock) {
    failures.push("lock_enqueue_should_block_when_scope_busy");
  }

  first.release();
  resetReviewExecutionLocksForTests();
  setupOcrReviewFlow();

  const a = enqueueReviewExecution({
    scopeId,
    type: "approve",
    payload: { message: "맞아", clockIso: "2026-06-01T12:00:00.000Z" },
  });
  const b = enqueueReviewExecution({
    scopeId,
    type: "date",
    payload: {
      patches: getReviewState().candidateIds.map((candidateId) => ({
        candidateId,
        date: "2026-06-03",
      })),
      clockIso: "2026-06-01T12:01:00.000Z",
    },
  });

  if (a.processed.length !== 1 || b.processed.length !== 1) {
    failures.push("queue_serial_processed_count");
  }

  const hashes = [a, b].map((r) => r.processed[0]?.proof.proofHash);
  if (new Set(hashes).size !== 2) {
    failures.push("queue_duplicate_proof_hash");
  }

  return failures;
}

function auditCounterfactual(
  proofApprove: CausalProof,
  proofDate: CausalProof
): string[] {
  const failures: string[] = [];
  resetOcrReviewFlowForTests();
  setupOcrReviewFlow();

  const ssotBefore = snapshotEventOsState("default", new Date()).scheduledEventCount;

  const cfBlocked = simulateCounterfactual(proofApprove, { action: "맞아" });
  if (!cfBlocked.simulated.execution.dryRun) {
    failures.push("cf_blocked_not_dry_run");
  }
  if (cfBlocked.simulated.ssotDelta.changed) {
    failures.push("cf_blocked_ssot_changed");
  }
  if (cfBlocked.simulated.commitDecision !== "BLOCKED") {
    failures.push(`cf_blocked_commit:${cfBlocked.simulated.commitDecision}`);
  }

  const ssotMid = snapshotEventOsState("default", new Date()).scheduledEventCount;
  if (ssotMid !== ssotBefore) {
    failures.push("cf_blocked_ssot_count_drift");
  }

  resetOcrReviewFlowForTests();
  setupOcrReviewFlow();
  traceSetCandidateDate({
    patches: getReviewState().candidateIds.map((candidateId) => ({
      candidateId,
      date: "2026-06-03",
    })),
  });

  const cfConfirm = simulateCounterfactual(proofDate, {
    action: "응",
    step: "confirm",
  });
  if (!cfConfirm.simulated.execution.dryRun) {
    failures.push("cf_confirm_not_dry_run");
  }
  if (cfConfirm.simulated.ssotDelta.changed) {
    failures.push("cf_confirm_dry_ssot_changed");
  }

  return failures;
}

function auditGraphGolden(canonical: {
  approve: CausalProof;
  date: CausalProof;
  confirm: CausalProof;
}): string[] {
  const failures: string[] = [];

  resetGraphVersionStoreForTests();
  resetProofPersistStoreForTests();
  eventOSOrchestrator.resetRuntimeCountersForTests();
  resetOcrReviewFlowForTests();
  setupOcrReviewFlow();

  const flowA = enqueueReviewExecution({
    scopeId: "default",
    type: "approve",
    payload: { message: "맞아" },
  });
  const patches = getReviewState().candidateIds.map((candidateId) => ({
    candidateId,
    date: "2026-06-03",
  }));
  const flowD = enqueueReviewExecution({
    scopeId: "default",
    type: "date",
    payload: { patches },
  });
  const flowC = enqueueReviewExecution({
    scopeId: "default",
    type: "confirm",
    payload: { message: "응" },
  });

  const orchProofs = [
    flowA.runtime?.processed[0]?.proof,
    flowD.runtime?.processed[0]?.proof,
    flowC.runtime?.processed[0]?.proof,
  ];

  for (const [label, proof] of [
    ["approve", canonical.approve],
    ["date", canonical.date],
    ["confirm", canonical.confirm],
  ] as const) {
    const regression = detectRegression(proof);
    if (regression.isRegression) {
      failures.push(
        `golden_regression_${label}:${regression.diffFields.join(",")}`
      );
    }
  }

  for (const [label, proof] of [
    ["orch_approve", orchProofs[0]],
    ["orch_date", orchProofs[1]],
    ["orch_confirm", orchProofs[2]],
  ] as const) {
    if (!proof) {
      failures.push(`${label}_proof_missing`);
      continue;
    }
    if (!getLineageByProofHash(proof.proofHash)) {
      failures.push(`graph_lineage_missing_${label}`);
    }
    if (!proof.proofHash) {
      failures.push(`graph_hash_missing_${label}`);
    }
  }

  const versions = getGraphVersionsForScope("default");
  if (versions.length < 3) {
    failures.push(`graph_versions:${versions.length}`);
  }
  if (!versions.some((v) => v.versionId.endsWith("-v1"))) {
    failures.push("graph_v1_baseline_missing");
  }

  const lastThree = versions.slice(-3);
  if (lastThree.length === 3) {
    const parent = lastThree[2]?.parentVersionId?.replace(/^proof:/, "");
    if (parent !== lastThree[1]?.proofHash) {
      failures.push("graph_lineage_chain_broken");
    }
    for (const v of lastThree) {
      if (!v.hash) {
        failures.push(`version_hash_missing:${v.versionId}`);
      }
    }
  }

  return failures;
}

function auditUiBinding(proofs: CausalProof[]): string[] {
  const failures: string[] = [];
  for (const proof of proofs) {
    const render = renderFromProof(proof);
    const binding = validateProofUiBinding(proof, render);
    if (binding.length > 0) {
      failures.push(`ui_binding_${proof.input.step}:${binding.join(",")}`);
    }
    if (proof.uiDiff !== "none" && render.instructions.length === 0) {
      failures.push(`ui_diff_without_instructions_${proof.input.step}`);
    }
  }
  return failures;
}

/**
 * Event OS 1~5단계 통합 검수 — CausalProof / Replay / Lock·Queue / Counterfactual / Graph+Golden.
 */
export function runEventOsIntegrationAudit(): EventOsIntegrationAuditReport {
  const allViolations: string[] = [];
  const stages: AuditStageResult[] = [];

  resetGraphVersionStoreForTests();
  resetCommandEventCandidatesForTests();
  enableDeterministicCommandIdsForTests();
  resetOcrReviewFlowForTests();
  setupOcrReviewFlow();

  // --- E2E: @캘린더 → 맞아 → 3.2 date → confirm ---
  let commandProof: CausalProof | undefined;
  try {
    const compiled = compileCommandToEventOs("@캘린더 14시 병원");
    commandProof = compiled.runtime.runtime?.processed[0]?.proof;
  } catch (error) {
    allViolations.push(
      `e2e_command_compile:${error instanceof Error ? error.message : "unknown"}`
    );
  }

  resetOcrReviewFlowForTests();
  setupOcrReviewFlow();

  const flowApprove = enqueueReviewExecution({
    scopeId: "default",
    type: "approve",
    payload: { message: "맞아", clockIso: "2026-06-01T12:00:00.000Z" },
  });
  const proofApprove = flowApprove.runtime?.processed[0]?.proof;
  if (!proofApprove) {
    allViolations.push("e2e_approve_proof_missing");
  }

  const patches = getReviewState().candidateIds.map((candidateId) => ({
    candidateId,
    date: "2026-06-03",
  }));

  const flowDate = enqueueReviewExecution({
    scopeId: "default",
    type: "date",
    payload: { patches, clockIso: "2026-06-01T12:01:00.000Z" },
  });
  const proofDate = flowDate.runtime?.processed[0]?.proof;

  const flowConfirm = enqueueReviewExecution({
    scopeId: "default",
    type: "confirm",
    payload: { message: "응", clockIso: "2026-06-01T12:02:00.000Z" },
  });
  const proofConfirm = flowConfirm.runtime?.processed[0]?.proof;

  const flowProofs = [commandProof, proofApprove, proofDate, proofConfirm].filter(
    Boolean
  ) as CausalProof[];

  // 1️⃣ CausalProof
  const causalFailures: string[] = [];
  for (const proof of flowProofs) {
    causalFailures.push(
      ...validateCausalProofContract(proof, proof.input.step)
    );
  }
  if (proofApprove?.uiDiff !== "show DATE_PICKER") {
    causalFailures.push("e2e_approve_ui_diff");
  }
  if (proofDate?.uiDiff !== "show CONFIRM_SCREEN") {
    causalFailures.push("e2e_date_ui_diff");
  }
  if (proofConfirm?.uiDiff !== "calendar_update + action_overlay") {
    causalFailures.push("e2e_confirm_ui_diff");
  }
  stages.push(stage("1_causal_proof", causalFailures));
  allViolations.push(...causalFailures);

  // UI binding (proof → render, stage 4 cross-check)
  const uiFailures = auditUiBinding(flowProofs);
  stages.push(stage("4_ui_render_binding", uiFailures));
  allViolations.push(...uiFailures);

  const canonical = buildCanonicalOcrProofs();

  // 2️⃣ Replay (canonical proofs — deterministic state prep per step)
  const replayFailures = auditReplay([
    canonical.approve,
    canonical.date,
    canonical.confirm,
  ]);
  stages.push(stage("2_replay", replayFailures, {
    note: "replay uses trace proofs with prepared state, not queue clock variants",
  }));
  allViolations.push(...replayFailures);

  // 3️⃣ Lock / Queue
  const lockFailures = auditLockQueue("default");
  stages.push(stage("3_lock_queue", lockFailures));
  allViolations.push(...lockFailures);

  // 4️⃣ Counterfactual (canonical)
  const cfFailures = auditCounterfactual(canonical.approve, canonical.date);
  stages.push(stage("4_counterfactual", cfFailures));
  allViolations.push(...cfFailures);

  // 5️⃣ Graph + Golden (canonical regression hash + orchestrator lineage)
  const graphFailures = auditGraphGolden(canonical);
  stages.push(stage("5_graph_golden", graphFailures));
  allViolations.push(...graphFailures);

  // E2E consistency
  const e2eFailures: string[] = [];
  if (proofApprove?.commitDecision !== "BLOCKED") {
    e2eFailures.push("e2e_approve_not_blocked");
  }
  if (proofDate?.commitDecision !== "PENDING_CONFIRM") {
    e2eFailures.push("e2e_date_not_pending_confirm");
  }
  if (proofConfirm?.commitDecision !== "EXECUTED") {
    e2eFailures.push("e2e_confirm_not_executed");
  }
  if (proofConfirm && !proofConfirm.ssotDelta.changed) {
    e2eFailures.push("e2e_confirm_ssot_unchanged");
  }
  stages.push(
    stage("e2e_scenario", e2eFailures, {
      steps: ["@캘린더 14시 병원", "맞아", "date 2026-06-03", "응"],
    })
  );
  allViolations.push(...e2eFailures);

  const graphVersions = getGraphVersionsForScope("default").map((v) => v.versionId);

  return {
    status: allViolations.length === 0 ? "PASS" : "FAIL",
    stages,
    e2e: {
      commandProofHash: commandProof?.proofHash,
      flowProofHashes: {
        approve: proofApprove?.proofHash ?? "",
        date: proofDate?.proofHash ?? "",
        confirm: proofConfirm?.proofHash ?? "",
      },
      graphVersions,
    },
    violations: allViolations,
  };
}
