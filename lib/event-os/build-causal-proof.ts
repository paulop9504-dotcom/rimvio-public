import { createHash } from "node:crypto";
import type {
  CausalProof,
  CausalProofExecution,
  CausalProofInput,
  CausalProofPlan,
  EventOsStateDiff,
  ProjectionDelta,
  SsotDelta,
  ValidationProof,
} from "@/lib/event-os/causal-proof-types";
import { CAUSAL_PROOF_VERSION } from "@/lib/event-os/causal-proof-types";
import type {
  CommitDecision,
  EventOsStateSnapshot,
  UiDiff,
  ValidationTraceResult,
} from "@/lib/event-os/causal-trace-types";
import { baseRelationGraph } from "@/lib/event-os/causal-graph";
import { diffEventOsState } from "@/lib/event-os/snapshot-event-os-state";
import { detectCausalAnomaliesFromProof } from "@/lib/event-os/validate-causal-trace";
import type { PendingCandidateValidation } from "@/lib/event-kernel/review/validate-pending-event-candidate";

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.keys(v as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = (v as Record<string, unknown>)[key];
            return acc;
          }, {})
      : v
  );
}

export function hashCausalProofBody(
  body: Omit<CausalProof, "proofHash">
): string {
  return createHash("sha256").update(stableStringify(body)).digest("hex");
}

export function buildCausalProof(input: {
  input: CausalProofInput;
  plan: CausalProofPlan;
  execution: CausalProofExecution;
  stateBefore: EventOsStateSnapshot;
  stateAfter: EventOsStateSnapshot;
  validationProof: ValidationProof;
  commitDecision: CommitDecision;
  uiDiff: UiDiff;
  causalChain: string[];
  overlayRowCount?: number;
  extraAnomalies?: string[];
}): CausalProof {
  const rawDiff = diffEventOsState(input.stateBefore, input.stateAfter);
  const stateDiff: EventOsStateDiff = {
    reviewStateChanged: rawDiff.reviewStateChanged,
    scheduledEventDelta: rawDiff.scheduledEventDelta,
    projectionRevisionDelta: rawDiff.projectionRevisionDelta,
    projectionEntryDelta: rawDiff.projectionEntryDelta,
    pendingDatesResolved: rawDiff.pendingDateResolved,
  };

  const ssotDelta: SsotDelta = {
    before: input.stateBefore.scheduledEventCount,
    after: input.stateAfter.scheduledEventCount,
    delta: stateDiff.scheduledEventDelta,
    changed: stateDiff.scheduledEventDelta !== 0,
  };

  const projectionDelta: ProjectionDelta = {
    revisionBefore: input.stateBefore.actionProjectionRevision,
    revisionAfter: input.stateAfter.actionProjectionRevision,
    entryCountBefore: input.stateBefore.actionProjectionEntryCount,
    entryCountAfter: input.stateAfter.actionProjectionEntryCount,
    impact:
      stateDiff.projectionRevisionDelta > 0
        ? "invalidate + recompute"
        : "none",
  };

  const execution: CausalProofExecution = {
    dryRun: input.execution.dryRun,
    stepsExecuted: input.execution.stepsExecuted,
    blockedByLock: input.execution.blockedByLock ?? false,
    executionRoute: input.execution.executionRoute,
    lockReason: input.execution.lockReason,
  };

  const body: Omit<CausalProof, "proofHash"> = {
    proofVersion: CAUSAL_PROOF_VERSION,
    input: input.input,
    plan: input.plan,
    execution,
    stateBefore: input.stateBefore,
    stateAfter: input.stateAfter,
    stateDiff,
    validationProof: input.validationProof,
    commitDecision: input.commitDecision,
    ssotDelta,
    projectionDelta,
    uiDiff: input.uiDiff,
    causalChain: input.causalChain,
    relationGraph: (() => {
      const graph = baseRelationGraph();
      return { nodes: graph.nodes, edges: graph.edges };
    })(),
    anomalies: input.extraAnomalies ?? [],
    overlayRowCount: input.overlayRowCount,
  };

  const anomalies = [
    ...body.anomalies,
    ...detectCausalAnomaliesFromProof({ ...body, proofHash: "" }),
  ];

  const withAnomalies = { ...body, anomalies };
  return {
    ...withAnomalies,
    proofHash: hashCausalProofBody(withAnomalies),
  };
}

export function validationProofFromRows(
  rows: PendingCandidateValidation[],
  resolved?: ValidationTraceResult
): ValidationProof {
  if (resolved) {
    return { result: resolved, rows };
  }
  if (rows.length === 0) {
    return { result: "NONE", rows };
  }
  if (rows.every((row) => row.status === "ready")) {
    return { result: "PASS", rows };
  }
  if (rows.some((row) => row.blockedBy.includes("MISSING_DATE"))) {
    return { result: "MISSING_DATE", rows };
  }
  if (rows.some((row) => row.blockedBy.includes("MISSING_TIME"))) {
    return { result: "MISSING_TIME", rows };
  }
  if (rows.some((row) => row.blockedBy.includes("AMBIGUOUS_TITLE"))) {
    return { result: "AMBIGUOUS_TITLE", rows };
  }
  return { result: "NONE", rows };
}
