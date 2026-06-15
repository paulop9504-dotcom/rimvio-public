import { personLabelsMatch } from "@/lib/people-graph/match-person-label";
import type { PersonMeaningRef } from "@/lib/people-graph/person-types";
import type { MeaningGraph } from "@/lib/meaning/meaning-types";

export function collectPersonMeanings(
  graph: MeaningGraph,
  displayName: string,
): PersonMeaningRef[] {
  const rows: PersonMeaningRef[] = [];

  for (const edge of graph.edges) {
    const involvesPerson =
      personLabelsMatch(edge.fromLabel, displayName) ||
      personLabelsMatch(edge.toLabel, displayName);

    if (!involvesPerson) {
      continue;
    }

    rows.push({
      edgeId: edge.id,
      kind: edge.kind,
      meaningLabel: edge.meaningLabel,
      score: edge.score.total,
    });
  }

  return rows.sort((a, b) => b.score - a.score);
}

export function scorePersonMeaning(meanings: readonly PersonMeaningRef[]): number {
  if (meanings.length === 0) {
    return 0;
  }
  const top = meanings.slice(0, 5);
  const avg = top.reduce((sum, row) => sum + row.score, 0) / top.length;
  const breadthBoost = Math.min(12, meanings.length * 2);
  return Math.min(100, Math.round(avg + breadthBoost));
}
