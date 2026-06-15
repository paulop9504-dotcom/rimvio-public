import type { CausalProof, CausalProofStep } from "@/lib/event-os/causal-proof-types";
import type { EventOsStateSnapshot, UiDiff } from "@/lib/event-os/causal-trace-types";
import type { LockedExecutionEdgeRelation } from "@/lib/event-kernel/schema-lock/edge-schema";

/** Schema-locked — see `lib/event-kernel/schema-lock/edge-schema.ts`. */
export type CausalEdgeRelation = LockedExecutionEdgeRelation;

export type ExecutionNodeType = CausalProofStep;

export type ExecutionNode = {
  id: string;
  type: ExecutionNodeType;
  causalProofHash: string;
  regressionHash: string;
  stateSnapshot: EventOsStateSnapshot;
  uiDiff: UiDiff;
  scenarioId?: string;
};

export type CausalEdge = {
  from: string;
  to: string;
  relation: CausalEdgeRelation;
};

/** Versioned execution graph — evolves per scope lineage. */
export type ExecutionCausalGraph = {
  version: string;
  scopeId: string;
  rootId: string;
  nodes: ExecutionNode[];
  edges: CausalEdge[];
  headProofHash: string;
};

export type ExecutionLineage = {
  rootId: string;
  parentId: string | null;
  version: number;
  timestamp: string;
  causalProofHash: string;
  scopeId: string;
};

export type GraphVersionChangeSet = {
  addedNodes: string[];
  addedEdges: string[];
  uiDiffFrom: UiDiff | null;
  uiDiffTo: UiDiff;
};

export type GraphVersion = {
  versionId: string;
  parentVersionId: string | null;
  graphSnapshot: ExecutionCausalGraph;
  changeSet: GraphVersionChangeSet;
  hash: string;
  proofHash: string;
  createdAt: string;
};

export type GoldenHashEntry = {
  scenarioId: string;
  expectedHash: string;
  proofHash?: string;
  description: string;
  createdAt: string;
  graphVersion?: string;
};

export type GoldenHashRegistry = Record<string, GoldenHashEntry>;

export type RegressionResult = {
  isRegression: boolean;
  scenarioId: string | null;
  diffFields: string[];
  expected: string | null;
  actual: string;
  proofHash: string;
};

export type GraphVersioningResult = {
  lineage: ExecutionLineage;
  graph: ExecutionCausalGraph;
  version: GraphVersion;
  regression: RegressionResult | null;
};

export type ProcessGraphVersioningInput = {
  proof: CausalProof;
  parentProofHash?: string | null;
  scenarioId?: string | null;
};
