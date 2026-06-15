import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import { computeRegressionHash } from "@/lib/event-os/graph-versioning/compute-regression-hash";
import type {
  CausalEdge,
  CausalEdgeRelation,
  ExecutionCausalGraph,
  ExecutionLineage,
  ExecutionNode,
} from "@/lib/event-os/graph-versioning/graph-versioning-types";

function nodeIdFromProof(proof: CausalProof): string {
  return `node:${proof.proofHash.slice(0, 16)}`;
}

function edgeRelationFromProof(
  proof: CausalProof,
  hasParent: boolean
): CausalEdgeRelation {
  if (proof.commitDecision === "BLOCKED") {
    return "BLOCKS";
  }
  if (hasParent && proof.uiDiff !== "none") {
    return "TRIGGERS";
  }
  return "CAUSES";
}

export function buildExecutionNode(
  proof: CausalProof,
  scenarioId?: string | null
): ExecutionNode {
  return {
    id: nodeIdFromProof(proof),
    type: proof.input.step,
    causalProofHash: proof.proofHash,
    regressionHash: computeRegressionHash(proof),
    stateSnapshot: proof.stateAfter,
    uiDiff: proof.uiDiff,
    scenarioId: scenarioId ?? undefined,
  };
}

export function buildExecutionLineage(input: {
  proof: CausalProof;
  parentProofHash?: string | null;
  version: number;
  rootId: string;
}): ExecutionLineage {
  return {
    rootId: input.rootId,
    parentId: input.parentProofHash ?? null,
    version: input.version,
    timestamp: input.proof.input.clockIso,
    causalProofHash: input.proof.proofHash,
    scopeId: input.proof.input.scopeId,
  };
}

export function buildExecutionGraph(input: {
  proof: CausalProof;
  lineage: ExecutionLineage;
  priorGraph: ExecutionCausalGraph | null;
  parentNode: ExecutionNode | null;
  scenarioId?: string | null;
}): ExecutionCausalGraph {
  const node = buildExecutionNode(input.proof, input.scenarioId);
  const nodes = input.priorGraph
    ? [...input.priorGraph.nodes, node]
    : [node];

  const edges: CausalEdge[] = input.priorGraph ? [...input.priorGraph.edges] : [];

  if (input.parentNode) {
    edges.push({
      from: input.parentNode.id,
      to: node.id,
      relation: edgeRelationFromProof(input.proof, true),
    });
  }

  if (input.proof.commitDecision === "BLOCKED") {
    edges.push({
      from: node.id,
      to: node.id,
      relation: "BLOCKS",
    });
  }

  const versionLabel = `v${input.lineage.version}`;

  return {
    version: versionLabel,
    scopeId: input.proof.input.scopeId,
    rootId: input.lineage.rootId,
    nodes,
    edges,
    headProofHash: input.proof.proofHash,
  };
}

export function buildGraphChangeSet(input: {
  priorGraph: ExecutionCausalGraph | null;
  nextGraph: ExecutionCausalGraph;
}): {
  addedNodes: string[];
  addedEdges: string[];
  uiDiffFrom: ExecutionCausalGraph["nodes"][0]["uiDiff"] | null;
  uiDiffTo: ExecutionCausalGraph["nodes"][0]["uiDiff"];
} {
  const priorNodeIds = new Set(
    (input.priorGraph?.nodes ?? []).map((n) => n.id)
  );
  const priorEdgeKeys = new Set(
    (input.priorGraph?.edges ?? []).map((e) => `${e.from}|${e.to}|${e.relation}`)
  );

  const addedNodes = input.nextGraph.nodes
    .filter((n) => !priorNodeIds.has(n.id))
    .map((n) => n.id);

  const addedEdges = input.nextGraph.edges
    .filter((e) => !priorEdgeKeys.has(`${e.from}|${e.to}|${e.relation}`))
    .map((e) => `${e.from}->${e.to}:${e.relation}`);

  const head = input.nextGraph.nodes[input.nextGraph.nodes.length - 1];
  const priorHead =
    input.priorGraph?.nodes[input.priorGraph.nodes.length - 1] ?? null;

  return {
    addedNodes,
    addedEdges,
    uiDiffFrom: priorHead?.uiDiff ?? null,
    uiDiffTo: head?.uiDiff ?? "none",
  };
}
