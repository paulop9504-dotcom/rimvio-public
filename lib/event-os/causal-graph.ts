import type { CausalGraphEdge, CausalGraphNode } from "@/lib/event-os/causal-trace-types";
import {
  LOCKED_CAUSAL_GRAPH_VERSION,
  LOCKED_CAUSAL_TRACE_EDGES,
} from "@/lib/event-kernel/schema-lock/edge-schema";

export const CAUSAL_GRAPH_VERSION = LOCKED_CAUSAL_GRAPH_VERSION;

export function baseRelationGraph(): {
  version: typeof CAUSAL_GRAPH_VERSION;
  nodes: CausalGraphNode[];
  edges: CausalGraphEdge[];
} {
  return {
    version: CAUSAL_GRAPH_VERSION,
    nodes: [
      "UI_Button",
      "Candidate_State",
      "Validation_Layer",
      "Event_SSOT",
      "Timeline",
      "Action_Projection",
      "UI_Layer",
    ],
    edges: [...LOCKED_CAUSAL_TRACE_EDGES],
  };
}

