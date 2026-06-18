import type { CausalGraphEdge, CausalGraphNode } from "@/lib/event-os/causal-trace-types";
import type { CausalEdge } from "@/lib/event-os/graph-versioning/graph-versioning-types";
import { EVENT_KERNEL_SCHEMA_LOCK_VERSION } from "@/lib/event-kernel/schema-lock/version";

export const LOCKED_EXECUTION_EDGE_RELATIONS = [
  "CAUSES",
  "BLOCKS",
  "TRIGGERS",
] as const;

export type LockedExecutionEdgeRelation =
  (typeof LOCKED_EXECUTION_EDGE_RELATIONS)[number];

/** Trace graph (Event OS causal proof) — frozen topology v1. */
export const LOCKED_CAUSAL_GRAPH_VERSION = "causal-trace-graph.v1" as const;

export const LOCKED_CAUSAL_GRAPH_NODES = [
  "UI_Button",
  "Candidate_State",
  "Validation_Layer",
  "Event_SSOT",
  "Timeline",
  "Action_Projection",
  "UI_Layer",
] as const satisfies readonly CausalGraphNode[];

export const LOCKED_CAUSAL_TRACE_EDGES: readonly CausalGraphEdge[] = [
  { from: "UI_Button", to: "Candidate_State", label: "user intent" },
  { from: "Candidate_State", to: "Validation_Layer", label: "validate" },
  { from: "Validation_Layer", to: "Event_SSOT", label: "commit gate" },
  { from: "Event_SSOT", to: "Timeline", label: "derive" },
  { from: "Timeline", to: "Action_Projection", label: "project" },
  { from: "Action_Projection", to: "UI_Layer", label: "overlay render" },
] as const;

export const LOCKED_TRACE_EDGE_LABELS = [
  "user intent",
  "validate",
  "commit gate",
  "derive",
  "project",
  "overlay render",
] as const;

const executionRelationSet = new Set<string>(LOCKED_EXECUTION_EDGE_RELATIONS);
const traceNodeSet = new Set<string>(LOCKED_CAUSAL_GRAPH_NODES);

export type EdgeSchemaValidationIssue = { code: string; detail?: string };

export function validateExecutionEdge(edge: CausalEdge): EdgeSchemaValidationIssue[] {
  const issues: EdgeSchemaValidationIssue[] = [];
  if (!edge.from?.trim() || !edge.to?.trim()) {
    issues.push({ code: "edge_endpoints_missing" });
  }
  if (!executionRelationSet.has(edge.relation)) {
    issues.push({
      code: "invalid_execution_relation",
      detail: String(edge.relation),
    });
  }
  return issues;
}

export function validateExecutionGraphEdges(
  edges: CausalEdge[],
): EdgeSchemaValidationIssue[] {
  return edges.flatMap((edge) => validateExecutionEdge(edge));
}

export function validateCausalTraceEdge(edge: CausalGraphEdge): EdgeSchemaValidationIssue[] {
  const issues: EdgeSchemaValidationIssue[] = [];
  if (!traceNodeSet.has(edge.from)) {
    issues.push({ code: "invalid_trace_from", detail: edge.from });
  }
  if (!traceNodeSet.has(edge.to)) {
    issues.push({ code: "invalid_trace_to", detail: edge.to });
  }
  if (!(LOCKED_TRACE_EDGE_LABELS as readonly string[]).includes(edge.label)) {
    issues.push({ code: "invalid_trace_label", detail: edge.label });
  }
  return issues;
}

export function assertValidExecutionGraphEdges(edges: CausalEdge[]): void {
  const issues = validateExecutionGraphEdges(edges);
  if (issues.length > 0) {
    throw new Error(
      `[schema-lock:${EVENT_KERNEL_SCHEMA_LOCK_VERSION}] execution edges invalid: ${issues.map((i) => i.code).join(",")}`,
    );
  }
}

export function edgeSchemaLockMeta() {
  return {
    schemaLockVersion: EVENT_KERNEL_SCHEMA_LOCK_VERSION,
    executionRelations: LOCKED_EXECUTION_EDGE_RELATIONS,
    traceGraphVersion: LOCKED_CAUSAL_GRAPH_VERSION,
    traceNodes: LOCKED_CAUSAL_GRAPH_NODES,
  };
}
