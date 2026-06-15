import type {
  ExecutionCausalGraph,
  ExecutionLineage,
  GraphVersion,
} from "@/lib/event-os/graph-versioning/graph-versioning-types";

const graphsByProofHash = new Map<string, ExecutionCausalGraph>();
const lineagesByProofHash = new Map<string, ExecutionLineage>();
const versionsByScope = new Map<string, GraphVersion[]>();
const nodeByProofHash = new Map<string, string>();

export function getGraphByProofHash(
  proofHash: string
): ExecutionCausalGraph | undefined {
  return graphsByProofHash.get(proofHash);
}

export function getLineageByProofHash(
  proofHash: string
): ExecutionLineage | undefined {
  return lineagesByProofHash.get(proofHash);
}

export function getGraphVersionsForScope(
  scopeId: string
): readonly GraphVersion[] {
  return versionsByScope.get(scopeId) ?? [];
}

export function getLatestGraphVersion(
  scopeId: string
): GraphVersion | undefined {
  const list = versionsByScope.get(scopeId);
  return list?.[list.length - 1];
}

export function getExecutionNodeIdForProof(
  proofHash: string
): string | undefined {
  return nodeByProofHash.get(proofHash);
}

export function storeGraphVersioning(input: {
  graph: ExecutionCausalGraph;
  lineage: ExecutionLineage;
  version: GraphVersion;
}): void {
  graphsByProofHash.set(input.graph.headProofHash, input.graph);
  lineagesByProofHash.set(input.lineage.causalProofHash, input.lineage);
  nodeByProofHash.set(
    input.lineage.causalProofHash,
    input.version.graphSnapshot.nodes[input.version.graphSnapshot.nodes.length - 1]
      ?.id ?? ""
  );

  const prior = versionsByScope.get(input.graph.scopeId) ?? [];
  versionsByScope.set(input.graph.scopeId, [...prior, input.version]);
}

export function resetGraphVersionStoreForTests(): void {
  graphsByProofHash.clear();
  lineagesByProofHash.clear();
  versionsByScope.clear();
  nodeByProofHash.clear();
}
