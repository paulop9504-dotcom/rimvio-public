import type {
  ExecutionLineage,
  GraphVersion,
  GraphVersioningResult,
} from "@/lib/event-os/graph-versioning/graph-versioning-types";
import { validateExecutionGraphEdges } from "@/lib/event-kernel/schema-lock/edge-schema";

export function validateGraphVersioning(
  result: GraphVersioningResult
): string[] {
  const failures: string[] = [];

  if (!result.lineage.causalProofHash) {
    failures.push("lineage_proof_hash_missing");
  }

  if (result.lineage.version < 1) {
    failures.push("lineage_version_invalid");
  }

  if (result.lineage.version > 1 && !result.lineage.parentId) {
    failures.push("lineage_parent_missing");
  }

  if (!result.version.hash) {
    failures.push("version_hash_missing");
  }

  if (!result.version.versionId) {
    failures.push("version_id_missing");
  }

  if (result.graph.nodes.length === 0) {
    failures.push("graph_nodes_empty");
  }

  for (const issue of validateExecutionGraphEdges(result.graph.edges)) {
    failures.push(`schema_lock_edge:${issue.code}`);
  }

  const head = result.graph.nodes[result.graph.nodes.length - 1];
  if (head?.causalProofHash !== result.graph.headProofHash) {
    failures.push("graph_head_mismatch");
  }

  if (head?.uiDiff !== result.version.changeSet.uiDiffTo) {
    failures.push("ui_change_without_graph_node_sync");
  }

  if (
    result.regression?.isRegression &&
    result.regression.scenarioId &&
    result.regression.diffFields.length === 0
  ) {
    failures.push("regression_flag_without_diff");
  }

  return failures;
}

export function assertNoSilentRegression(
  regression: GraphVersioningResult["regression"]
): string[] {
  if (!regression?.scenarioId) {
    return [];
  }
  if (regression.isRegression) {
    return [
      `regression_detected:${regression.scenarioId}:${regression.diffFields.join(",")}`,
    ];
  }
  return [];
}
