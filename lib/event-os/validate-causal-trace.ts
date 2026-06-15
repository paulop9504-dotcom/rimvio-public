import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import type { EventOsCausalTrace } from "@/lib/event-os/causal-trace-types";

export function detectCausalAnomaliesFromProof(proof: CausalProof): string[] {
  const anomalies: string[] = [];

  if (proof.commitDecision === "BLOCKED" && proof.ssotDelta.changed) {
    anomalies.push("commit_blocked_but_ssot_changed");
  }

  if (proof.commitDecision === "EXECUTED" && !proof.ssotDelta.changed) {
    anomalies.push("commit_executed_without_ssot_change");
  }

  if (
    proof.uiDiff !== "none" &&
    !proof.ssotDelta.changed &&
    proof.commitDecision !== "BLOCKED" &&
    proof.uiDiff.includes("calendar_update")
  ) {
    anomalies.push("ui_calendar_update_without_ssot");
  }

  if (
    proof.projectionDelta.impact === "invalidate + recompute" &&
    !proof.ssotDelta.changed
  ) {
    anomalies.push("projection_invalidated_without_ssot");
  }

  if (
    proof.validationProof.result === "MISSING_DATE" &&
    proof.commitDecision === "EXECUTED"
  ) {
    anomalies.push("missing_date_but_committed");
  }

  if (proof.stateAfter.pendingCandidates.some((row) => row.date === null)) {
    const autoFilled = proof.stateBefore.pendingCandidates.every(
      (row, index) =>
        row.date === null &&
        proof.stateAfter.pendingCandidates[index]?.date !== null &&
        proof.input.action === "맞아"
    );
    if (autoFilled && proof.commitDecision === "EXECUTED") {
      anomalies.push("date_auto_filled_on_approve");
    }
  }

  return anomalies;
}

export function assertProofExpectations(
  proof: CausalProof,
  expected: {
    validationResult?: CausalProof["validationProof"]["result"];
    commitDecision?: CausalProof["commitDecision"];
    ssotChanged?: boolean;
    projectionImpact?: CausalProof["projectionDelta"]["impact"];
    uiDiff?: CausalProof["uiDiff"];
    proofHash?: string;
  }
): string[] {
  const failures: string[] = [];

  if (
    expected.validationResult &&
    proof.validationProof.result !== expected.validationResult
  ) {
    failures.push(
      `validationResult expected ${expected.validationResult} got ${proof.validationProof.result}`
    );
  }
  if (
    expected.commitDecision &&
    proof.commitDecision !== expected.commitDecision
  ) {
    failures.push(
      `commitDecision expected ${expected.commitDecision} got ${proof.commitDecision}`
    );
  }
  if (
    expected.ssotChanged !== undefined &&
    proof.ssotDelta.changed !== expected.ssotChanged
  ) {
    failures.push(
      `ssotChanged expected ${expected.ssotChanged} got ${proof.ssotDelta.changed}`
    );
  }
  if (
    expected.projectionImpact &&
    proof.projectionDelta.impact !== expected.projectionImpact
  ) {
    failures.push(
      `projectionImpact expected ${expected.projectionImpact} got ${proof.projectionDelta.impact}`
    );
  }
  if (expected.uiDiff && proof.uiDiff !== expected.uiDiff) {
    failures.push(`uiDiff expected ${expected.uiDiff} got ${proof.uiDiff}`);
  }
  if (expected.proofHash && proof.proofHash !== expected.proofHash) {
    failures.push(`proofHash mismatch`);
  }

  const anomalies = detectCausalAnomaliesFromProof(proof);
  if (anomalies.length > 0) {
    failures.push(...anomalies.map((row) => `anomaly:${row}`));
  }

  return failures;
}

/** Legacy trace shape for transitional tests. */
export function proofToLegacyTrace(proof: CausalProof): EventOsCausalTrace {
  return {
    inputAction: proof.input.action,
    triggeredFunction: proof.plan.triggeredFunction,
    triggeredChain: proof.plan.triggeredChain,
    stateBefore: proof.stateBefore,
    stateAfter: proof.stateAfter,
    validationResult: proof.validationProof.result,
    commitDecision: proof.commitDecision,
    eventSSOTChange: proof.ssotDelta.changed,
    projectionImpact: proof.projectionDelta.impact,
    uiDiff: proof.uiDiff,
    causalChain: proof.causalChain,
    relationGraph: proof.relationGraph,
    validations: proof.validationProof.rows,
    executionRoute: proof.execution.executionRoute,
    anomalies: proof.anomalies,
  };
}

export function detectCausalAnomalies(trace: EventOsCausalTrace): string[] {
  return detectCausalAnomaliesFromProof(proofToLegacyTraceFromFields(trace));
}

function proofToLegacyTraceFromFields(trace: EventOsCausalTrace): CausalProof {
  return {
    proofVersion: "v1",
    input: {
      action: trace.inputAction,
      step: "approve",
      scopeId: "default",
      clockIso: new Date(0).toISOString(),
    },
    plan: {
      triggeredFunction: trace.triggeredFunction,
      triggeredChain: trace.triggeredChain,
      intendedCommit: trace.commitDecision,
    },
    execution: {
      dryRun: false,
      stepsExecuted: trace.triggeredChain,
      blockedByLock: false,
      executionRoute: trace.executionRoute,
    },
    stateBefore: trace.stateBefore,
    stateAfter: trace.stateAfter,
    stateDiff: {
      reviewStateChanged: false,
      scheduledEventDelta: 0,
      projectionRevisionDelta: 0,
      projectionEntryDelta: 0,
      pendingDatesResolved: false,
    },
    validationProof: {
      result: trace.validationResult,
      rows: trace.validations ?? [],
    },
    commitDecision: trace.commitDecision,
    ssotDelta: {
      before: trace.stateBefore.scheduledEventCount,
      after: trace.stateAfter.scheduledEventCount,
      delta: trace.stateAfter.scheduledEventCount - trace.stateBefore.scheduledEventCount,
      changed: trace.eventSSOTChange,
    },
    projectionDelta: {
      revisionBefore: trace.stateBefore.actionProjectionRevision,
      revisionAfter: trace.stateAfter.actionProjectionRevision,
      entryCountBefore: trace.stateBefore.actionProjectionEntryCount,
      entryCountAfter: trace.stateAfter.actionProjectionEntryCount,
      impact: trace.projectionImpact,
    },
    uiDiff: trace.uiDiff,
    causalChain: trace.causalChain,
    relationGraph: trace.relationGraph,
    proofHash: "",
    anomalies: trace.anomalies,
  };
}

export function assertTraceExpectations(
  trace: EventOsCausalTrace,
  expected: Partial<EventOsCausalTrace>
): string[] {
  return assertProofExpectations(proofToLegacyTraceFromFields(trace), {
    validationResult: expected.validationResult,
    commitDecision: expected.commitDecision,
    ssotChanged: expected.eventSSOTChange,
    projectionImpact: expected.projectionImpact,
    uiDiff: expected.uiDiff,
  });
}
