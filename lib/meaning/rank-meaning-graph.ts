import type {
  MeaningEdge,
  MeaningEdgeKind,
  MeaningGraph,
  MeaningNode,
  MeaningNodeKind,
} from "@/lib/meaning/meaning-types";

export function topMeaningNodes(
  graph: MeaningGraph,
  input?: { limit?: number; kind?: MeaningNodeKind },
): MeaningNode[] {
  const limit = input?.limit ?? 10;
  let rows = [...graph.nodes];
  if (input?.kind) {
    rows = rows.filter((row) => row.kind === input.kind);
  }
  return rows.slice(0, limit);
}

export function topMeaningEdges(
  graph: MeaningGraph,
  input?: { limit?: number; kind?: MeaningEdgeKind },
): MeaningEdge[] {
  const limit = input?.limit ?? 10;
  let rows = [...graph.edges];
  if (input?.kind) {
    rows = rows.filter((row) => row.kind === input.kind);
  }
  return rows.slice(0, limit);
}

export function findMeaningEdge(
  graph: MeaningGraph,
  input: { fromLabel: string; toLabel: string; kind?: MeaningEdgeKind },
): MeaningEdge | null {
  const kind = input.kind;
  const hit = graph.edges.find((edge) => {
    if (kind && edge.kind !== kind) {
      return false;
    }
    const forward =
      edge.fromLabel === input.fromLabel && edge.toLabel === input.toLabel;
    const reverse =
      edge.kind === "person_person" &&
      edge.fromLabel === input.toLabel &&
      edge.toLabel === input.fromLabel;
    return forward || reverse;
  });
  return hit ?? null;
}
