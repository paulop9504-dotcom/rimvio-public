#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { PeerContact } from "../lib/context/peer-contact-types";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { FeedCaptureFragment } from "../lib/feed/feed-capture-types";
import {
  buildPeopleGraph,
  findPersonNode,
  topPeopleByMeaning,
  topPeopleByRelationship,
} from "../lib/people-graph";
import { projectSharedGlobe } from "../lib/shared-globe";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-people-test",
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

const contacts: PeerContact[] = [
  {
    peerThreadId: "peer-dm-a__b",
    displayName: "민수",
    rimvioId: "minsu",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    peerThreadId: "peer-dm-a__c",
    displayName: "지연",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
];

const jejuTrips = [1, 2, 3].map((trip) =>
  baseEvent({
    id: `ev-jeju-${trip}`,
    title: `민수랑 제주 Day ${trip}`,
    place: "제주시",
    datetime: `2026-0${trip}-10T09:00:00.000Z`,
    metadata: {
      planPeerThreadId: "peer-group-jeju",
      planPeerDisplayName: "민수",
      feedCaptures: captures([
        { id: `p-${trip}`, placeLabel: "제주시", verified: true },
      ]),
    },
  }),
);

const wedding = baseEvent({
  id: "ev-wedding",
  title: "민수 결혼식",
  category: "social",
  place: "서울",
  metadata: {
    planPeerDisplayName: "민수",
    attendees: ["지연", "현우"],
    feedCaptures: captures([{ id: "w1", verified: true }]),
  },
});

const events = [...jejuTrips, wedding];
const globe = projectSharedGlobe({
  primaryEvent: jejuTrips[0]!,
  threadId: "peer-group-jeju",
  globePins: [],
});

const graph = buildPeopleGraph({
  contacts,
  events,
  sharedGlobes: [globe],
  now: new Date("2026-06-10T12:00:00.000Z"),
});

assert.ok(graph.people.length >= 3);
assert.equal(graph.contactCount, 2);

const minsu = findPersonNode(graph, {
  displayName: "민수",
  peerThreadId: "peer-dm-a__b",
});
assert.ok(minsu);
assert.equal(minsu!.source, "peer_contact");
assert.ok(minsu!.experiences.length >= 4);
assert.ok(minsu!.places.some((row) => row.label === "제주"));
assert.ok(minsu!.meanings.length > 0);
assert.ok(minsu!.relationshipScore.total > 0);
assert.ok(minsu!.meaningScore > 0);
assert.ok(minsu!.relationshipScore.hasDirectThread);

const jiyeon = findPersonNode(graph, { displayName: "지연" });
assert.ok(jiyeon);
assert.ok(jiyeon!.experiences.some((row) => row.eventId === "ev-wedding"));

const topRel = topPeopleByRelationship(graph, 3);
const topMean = topPeopleByMeaning(graph, 3);
assert.equal(topRel[0]?.displayName, "민수");
assert.ok(topMean[0]!.meaningScore > 0);

console.log("--- People Graph ---");
console.log(`people=${graph.people.length} contacts=${graph.contactCount} discovered=${graph.discoveredCount}`);
console.log("\n--- Top Relationship ---");
for (const person of topRel) {
  console.log(
    `  ${person.displayName} rel=${person.relationshipScore.total} exp=${person.experiences.length} thread=${person.relationshipScore.hasDirectThread}`,
  );
}
console.log("\n--- Top Meaning ---");
for (const person of topMean) {
  console.log(
    `  ${person.displayName} meaning=${person.meaningScore} edges=${person.meanings.length} top=${person.meanings[0]?.meaningLabel ?? "—"}`,
  );
}

console.log("\ntest-people-graph: ok");
