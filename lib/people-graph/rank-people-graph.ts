import type { PeopleGraph, PersonNode } from "@/lib/people-graph/person-types";

export function topPeopleByRelationship(
  graph: PeopleGraph,
  limit = 10,
): PersonNode[] {
  return [...graph.people]
    .sort((a, b) => b.relationshipScore.total - a.relationshipScore.total)
    .slice(0, limit);
}

export function topPeopleByMeaning(
  graph: PeopleGraph,
  limit = 10,
): PersonNode[] {
  return [...graph.people]
    .sort((a, b) => b.meaningScore - a.meaningScore)
    .slice(0, limit);
}

export function findPersonNode(
  graph: PeopleGraph,
  input: { displayName?: string; peerThreadId?: string },
): PersonNode | null {
  const threadId = input.peerThreadId?.trim();
  if (threadId) {
    const byThread = graph.people.find((row) => row.peerThreadId === threadId);
    if (byThread) {
      return byThread;
    }
  }

  const label = input.displayName?.trim();
  if (!label) {
    return null;
  }

  return (
    graph.people.find((row) => row.displayName === label) ??
    graph.people.find((row) =>
      row.displayName.toLowerCase().includes(label.toLowerCase()),
    ) ??
    null
  );
}
