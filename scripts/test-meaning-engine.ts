#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { FeedCaptureFragment } from "../lib/feed/feed-capture-types";
import {
  buildMeaningGraph,
  findMeaningEdge,
  topMeaningEdges,
  topMeaningNodes,
} from "../lib/meaning";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-meaning-test",
    title: "테스트",
    category: "travel",
    source: "message",
    lifecycle: "completed",
    confidence: 0.8,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function captures(rows: Partial<FeedCaptureFragment>[]): FeedCaptureFragment[] {
  return rows.map((row, index) => ({
    id: row.id ?? `cap-${index}`,
    kind: row.kind ?? "photo",
    capturedAtIso: row.capturedAtIso ?? new Date().toISOString(),
    verified: row.verified ?? true,
    ...row,
  }));
}

const now = new Date("2026-06-06T12:00:00.000Z");

const jejuTrips = [1, 2, 3].map((trip) =>
  baseEvent({
    id: `ev-jeju-${trip}`,
    title: `민수랑 제주 Day ${trip}`,
    place: "제주시",
    datetime: `2026-0${trip}-10T09:00:00.000Z`,
    metadata: {
      planPeerDisplayName: "민수",
      planPeerThreadId: "peer-group-jeju",
      feedCaptures: captures([
        {
          id: `p-${trip}`,
          kind: "photo",
          placeLabel: "제주시",
          dwellMinutes: 120,
        },
        {
          id: `gps-${trip}`,
          kind: "gps_dwell",
          placeLabel: "애월",
          dwellMinutes: 45,
        },
      ]),
    },
  }),
);

const wedding = baseEvent({
  id: "ev-wedding",
  title: "민수 결혼식",
  category: "social",
  place: "서울 웨딩홀",
  metadata: {
    planPeerDisplayName: "민수",
    attendees: ["지연", "현우"],
    feedCaptures: captures([{ id: "w1", kind: "photo", verified: true }]),
  },
});

const business = baseEvent({
  id: "ev-germany",
  title: "독일 출장",
  place: "프랑크푸르트",
  metadata: {
    planPeerDisplayName: "A,B,C",
    feedCaptures: captures([{ id: "g1", kind: "memo", placeLabel: "프랑크푸르트" }]),
  },
});

const graph = buildMeaningGraph([...jejuTrips, wedding, business], now);

assert.ok(graph.observationCount >= 5);
assert.ok(graph.nodes.length > 0);
assert.ok(graph.edges.length > 0);

const minsuJeju = findMeaningEdge(graph, {
  kind: "person_place",
  fromLabel: "민수",
  toLabel: "제주",
});
assert.ok(minsuJeju, "expected person_place edge: 민수 ↔ 제주");
assert.equal(minsuJeju!.score.frequency, 3);
assert.equal(minsuJeju!.meaningLabel, "민수 = 제주");

const topEdges = topMeaningEdges(graph, { limit: 5 });
const topNodes = topMeaningNodes(graph, { limit: 5 });

assert.ok(
  topEdges.some((edge) => edge.meaningLabel === "민수 = 제주"),
  "민수 = 제주 should rank in top edges",
);
assert.ok(
  topNodes.some((node) => node.label === "민수" && node.kind === "person"),
  "민수 should be a top person node",
);
assert.ok(
  topNodes.some((node) => node.label === "제주" && node.kind === "place"),
  "제주 should be a top place node",
);

const personPerson = findMeaningEdge(graph, {
  kind: "person_person",
  fromLabel: "민수",
  toLabel: "지연",
});
assert.ok(personPerson, "wedding co-attendance should link 민수 ↔ 지연");

console.log("--- Meaning Graph ---");
console.log(`observations=${graph.observationCount} nodes=${graph.nodes.length} edges=${graph.edges.length}`);
console.log("\n--- Top Meaning Nodes ---");
for (const node of topNodes) {
  console.log(`  [${node.kind}] ${node.label} score=${node.score} events=${node.eventCount}`);
}
console.log("\n--- Top Meaning Edges ---");
for (const edge of topEdges) {
  console.log(
    `  ${edge.meaningLabel} (${edge.kind}) total=${edge.score.total} freq=${edge.score.frequency} recency=${edge.score.recency}`,
  );
}

console.log("\ntest-meaning-engine: ok");
