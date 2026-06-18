import type { PendingCandidateValidation } from "@/lib/event-kernel/review/validate-pending-event-candidate";
import type {
  CausalGraphEdge,
  CausalGraphNode,
  CommitDecision,
  EventOsStateSnapshot,
  ProjectionImpact,
  UiDiff,
  ValidationTraceResult,
} from "@/lib/event-os/causal-trace-types";

export const CAUSAL_PROOF_VERSION = "v1" as const;

export type CausalProofStep =
  | "approve"
  | "date"
  | "confirm"
  | "search"
  | "action"
  | "command"
  | "full_flow";

export type CausalProofInput = {
  action: string;
  step: CausalProofStep;
  scopeId: string;
  clockIso: string;
  patches?: Array<{ candidateId: string; date: string }>;
  syncClient?: boolean;
};

export type CausalProofPlan = {
  triggeredFunction: string;
  triggeredChain: string[];
  intendedCommit: CommitDecision;
};

export type CausalProofExecution = {
  dryRun: boolean;
  stepsExecuted: string[];
  executionRoute?: string;
  blockedByLock: boolean;
  lockReason?: string;
};

export type EventOsStateDiff = {
  reviewStateChanged: boolean;
  scheduledEventDelta: number;
  projectionRevisionDelta: number;
  projectionEntryDelta: number;
  pendingDatesResolved: boolean;
};

export type ValidationProof = {
  result: ValidationTraceResult;
  rows: PendingCandidateValidation[];
};

export type SsotDelta = {
  before: number;
  after: number;
  delta: number;
  changed: boolean;
};

export type ProjectionDelta = {
  revisionBefore: number;
  revisionAfter: number;
  entryCountBefore: number;
  entryCountAfter: number;
  impact: ProjectionImpact;
};

/** Execution contract — trace is proof, not a log. */
export type CausalProof = {
  proofVersion: typeof CAUSAL_PROOF_VERSION;
  input: CausalProofInput;
  plan: CausalProofPlan;
  execution: CausalProofExecution;
  stateBefore: EventOsStateSnapshot;
  stateAfter: EventOsStateSnapshot;
  stateDiff: EventOsStateDiff;
  validationProof: ValidationProof;
  commitDecision: CommitDecision;
  ssotDelta: SsotDelta;
  projectionDelta: ProjectionDelta;
  uiDiff: UiDiff;
  causalChain: string[];
  relationGraph: {
    nodes: CausalGraphNode[];
    edges: CausalGraphEdge[];
  };
  proofHash: string;
  anomalies: string[];
  overlayRowCount?: number;
};

