import type { CausalProof } from "@/lib/event-os/causal-proof-types";
import {
  buildExecutionGraph,
  buildExecutionLineage,
  buildExecutionNode,
  buildGraphChangeSet,
} from "@/lib/event-os/graph-versioning/build-execution-graph";
import { hashGraphSnapshot } from "@/lib/event-os/graph-versioning/compute-regression-hash";
import { detectRegression } from "@/lib/event-os/graph-versioning/detect-regression";
import type {
  GraphVersion,
  GraphVersioningResult,
  ProcessGraphVersioningInput,
} from "@/lib/event-os/graph-versioning/graph-versioning-types";
import {
  getGraphByProofHash,
  getLatestGraphVersion,
  storeGraphVersioning,
} from "@/lib/event-os/graph-versioning/graph-version-store";
import { inferScenarioId } from "@/lib/event-os/graph-versioning/infer-scenario-id";
import { validateGraphVersioning } from "@/lib/event-os/graph-versioning/validate-graph-versioning";

function parentVersionId(
  parentProofHash: string | null | undefined
): string | null {
  return parentProofHash ? `proof:${parentProofHash}` : null;
}

/**
 * Full pipeline: CausalProof → graph → version → golden compare → store.
 */
export function versionGraphFromProof(
  input: ProcessGraphVersioningInput
): GraphVersioningResult {
  const { proof } = input;
  const scopeId = proof.input.scopeId;
  const scenarioId = input.scenarioId ?? inferScenarioId(proof);

  const priorVersion = getLatestGraphVersion(scopeId);
  const priorGraph = priorVersion?.graphSnapshot ?? null;
  const parentProofHash =
    input.parentProofHash ?? priorVersion?.proofHash ?? null;

  const versionNumber = (priorVersion ? priorGraph?.nodes.length ?? 0 : 0) + 1;
  const rootId =
    priorGraph?.rootId ??
    `root:${parentProofHash ?? proof.proofHash}`.slice(0, 40);

  const lineage = buildExecutionLineage({
    proof,
    parentProofHash,
    version: versionNumber,
    rootId,
  });

  const parentNode =
    parentProofHash && priorGraph
      ? priorGraph.nodes.find((n) => n.causalProofHash === parentProofHash) ??
        getGraphByProofHash(parentProofHash)?.nodes.find(
          (n) => n.causalProofHash === parentProofHash
        ) ??
        null
      : null;

  if (parentProofHash && versionNumber > 1 && !parentNode) {
    throw new Error("graph_versioning:lineage_parent_node_missing");
  }

  const graph = buildExecutionGraph({
    proof,
    lineage,
    priorGraph,
    parentNode,
    scenarioId,
  });

  const changeSet = buildGraphChangeSet({ priorGraph, nextGraph: graph });
  const graphHash = hashGraphSnapshot(graph);

  const version: GraphVersion = {
    versionId: `${scopeId}-v${versionNumber}`,
    parentVersionId: parentVersionId(parentProofHash),
    graphSnapshot: graph,
    changeSet,
    hash: graphHash,
    proofHash: proof.proofHash,
    createdAt: proof.input.clockIso,
  };

  const regression = detectRegression(proof, scenarioId);

  const result: GraphVersioningResult = {
    lineage,
    graph,
    version,
    regression,
  };

  const failures = validateGraphVersioning(result);
  if (failures.length > 0) {
    throw new Error(`graph_versioning_guard:${failures.join(",")}`);
  }

  storeGraphVersioning(result);
  return result;
}
