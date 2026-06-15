import { extractMeaningObservations } from "@/lib/meaning/extract-meaning-observations";
import { formatMeaningLabel } from "@/lib/meaning/format-meaning-label";
import {
  meaningEdgeId,
  meaningNodeId,
} from "@/lib/meaning/meaning-node-id";
import {
  createMeaningEdgeAccumulator,
  scoreMeaningEdge,
  type MeaningEdgeAccumulator,
} from "@/lib/meaning/score-meaning-edge";
import {
  MEANING_MIN_EDGE_TOTAL,
  type MeaningEdge,
  type MeaningEdgeKind,
  type MeaningGraph,
  type MeaningNode,
  type MeaningNodeKind,
} from "@/lib/meaning/meaning-types";
import type { EventCandidate } from "@/lib/events/event-candidate";

type EdgeBucket = {
  kind: MeaningEdgeKind;
  fromId: string;
  toId: string;
  fromLabel: string;
  toLabel: string;
  acc: MeaningEdgeAccumulator;
};

function touchEdge(
  buckets: Map<string, EdgeBucket>,
  input: {
    kind: MeaningEdgeKind;
    fromKind: MeaningNodeKind;
    fromLabel: string;
    toKind: MeaningNodeKind;
    toLabel: string;
    eventId: string;
    atMs: number;
    dwellMinutes: number;
    verifyCount: number;
    coPresenceHits?: number;
  },
): void {
  const fromId = meaningNodeId(input.fromKind, input.fromLabel);
  const toId = meaningNodeId(input.toKind, input.toLabel);
  const id = meaningEdgeId(input.kind, fromId, toId);

  let bucket = buckets.get(id);
  if (!bucket) {
    bucket = {
      kind: input.kind,
      fromId,
      toId,
      fromLabel: input.fromLabel,
      toLabel: input.toLabel,
      acc: createMeaningEdgeAccumulator(),
    };
    buckets.set(id, bucket);
  }

  bucket.acc.eventIds.add(input.eventId);
  bucket.acc.lastAtMs = Math.max(bucket.acc.lastAtMs, input.atMs);
  bucket.acc.totalDwellMinutes += input.dwellMinutes;
  bucket.acc.verifyCount += input.verifyCount;
  bucket.acc.coPresenceHits += input.coPresenceHits ?? 1;
}

function ingestObservation(
  buckets: Map<string, EdgeBucket>,
  row: ReturnType<typeof extractMeaningObservations>[number],
): void {
  const atMs = Date.parse(row.atIso) || Date.now();

  for (const person of row.people) {
    for (const place of row.places) {
      touchEdge(buckets, {
        kind: "person_place",
        fromKind: "person",
        fromLabel: person,
        toKind: "place",
        toLabel: place,
        eventId: row.eventId,
        atMs,
        dwellMinutes: row.dwellMinutes,
        verifyCount: row.verifyCount,
      });
    }

    touchEdge(buckets, {
      kind: "person_experience",
      fromKind: "person",
      fromLabel: person,
      toKind: "experience",
      toLabel: row.experienceKey,
      eventId: row.eventId,
      atMs,
      dwellMinutes: row.dwellMinutes,
      verifyCount: row.verifyCount,
    });
  }

  for (const place of row.places) {
    touchEdge(buckets, {
      kind: "place_experience",
      fromKind: "place",
      fromLabel: place,
      toKind: "experience",
      toLabel: row.experienceKey,
      eventId: row.eventId,
      atMs,
      dwellMinutes: row.dwellMinutes,
      verifyCount: row.verifyCount,
    });
  }

  if (row.people.length >= 2) {
    for (let i = 0; i < row.people.length; i += 1) {
      for (let j = i + 1; j < row.people.length; j += 1) {
        touchEdge(buckets, {
          kind: "person_person",
          fromKind: "person",
          fromLabel: row.people[i]!,
          toKind: "person",
          toLabel: row.people[j]!,
          eventId: row.eventId,
          atMs,
          dwellMinutes: row.dwellMinutes,
          verifyCount: row.verifyCount,
          coPresenceHits: 2,
        });
      }
    }
  }
}

function nodeKindFromId(id: string): MeaningNodeKind {
  if (id.startsWith("person:")) {
    return "person";
  }
  if (id.startsWith("place:")) {
    return "place";
  }
  return "experience";
}

function registerNode(
  nodeMap: Map<string, MeaningNode>,
  id: string,
  label: string,
  edgeTotal: number,
  eventCount: number,
): void {
  const existing = nodeMap.get(id);
  if (existing) {
    existing.score += edgeTotal;
    existing.eventCount += eventCount;
    return;
  }
  nodeMap.set(id, {
    id,
    kind: nodeKindFromId(id),
    label,
    score: edgeTotal,
    eventCount,
  });
}

function buildNodes(edges: readonly MeaningEdge[]): MeaningNode[] {
  const nodeMap = new Map<string, MeaningNode>();

  for (const edge of edges) {
    registerNode(
      nodeMap,
      edge.from,
      edge.fromLabel,
      edge.score.total,
      edge.score.frequency,
    );
    registerNode(
      nodeMap,
      edge.to,
      edge.toLabel,
      edge.score.total,
      edge.score.frequency,
    );
  }

  return [...nodeMap.values()].sort((a, b) => b.score - a.score);
}

/** Pure read — build meaning graph from committed events. */
export function buildMeaningGraph(
  events: readonly EventCandidate[],
  now = new Date(),
): MeaningGraph {
  const observations = extractMeaningObservations(events);
  const buckets = new Map<string, EdgeBucket>();
  const nowMs = now.getTime();

  for (const row of observations) {
    ingestObservation(buckets, row);
  }

  const edges: MeaningEdge[] = [];

  for (const bucket of buckets.values()) {
    const score = scoreMeaningEdge(bucket.acc, nowMs);
    if (score.total < MEANING_MIN_EDGE_TOTAL && score.frequency < 2) {
      continue;
    }

    edges.push({
      id: meaningEdgeId(bucket.kind, bucket.fromId, bucket.toId),
      kind: bucket.kind,
      from: bucket.fromId,
      to: bucket.toId,
      fromLabel: bucket.fromLabel,
      toLabel: bucket.toLabel,
      score,
      meaningLabel: formatMeaningLabel({
        kind: bucket.kind,
        fromLabel: bucket.fromLabel,
        toLabel: bucket.toLabel,
        frequency: score.frequency,
      }),
      eventIds: [...bucket.acc.eventIds],
    });
  }

  edges.sort((a, b) => b.score.total - a.score.total || b.score.frequency - a.score.frequency);

  return {
    nodes: buildNodes(edges),
    edges,
    builtAt: now.toISOString(),
    observationCount: observations.length,
  };
}
