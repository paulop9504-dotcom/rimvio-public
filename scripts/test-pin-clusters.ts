#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildExperienceGraphFromEvents } from "../lib/experience-graph";
import { formatPinDateLabel } from "../lib/globe/format-pin-date-label";
import {
  findPinClusterByEventId,
  projectPinClusterClassifiedPins,
  projectPinClustersFromGraph,
} from "../lib/globe/project-pin-clusters";
import { indexEventsById } from "../lib/plan-context/project-plan-to-feed-slot";
import { buildGlobeFeedHref } from "../lib/experience-graph/build-globe-feed-link";

function event(
  id: string,
  title: string,
  place: string,
  iso: string,
  captures?: EventCandidate["metadata"],
): EventCandidate {
  const stamp = new Date().toISOString();
  return {
    id,
    title,
    category: "travel",
    source: "manual",
    lifecycle: "scheduled",
    datetime: iso,
    place,
    confidence: 0.9,
    metadata: captures,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

const wedding = event("ec-wedding", "민수 결혼식", "서울", "2027-04-12T15:00:00+09:00", {
  feedCaptures: Array.from({ length: 12 }, (_, index) => ({
    id: `photo-${index}`,
    kind: "photo",
    capturedAtIso: "2027-04-12T16:00:00+09:00",
  })).concat(
    Array.from({ length: 4 }, (_, index) => ({
      id: `memo-${index}`,
      kind: "memo",
      capturedAtIso: "2027-04-12T16:30:00+09:00",
    })),
  ),
});

const jeju = event("ec-jeju", "제주 여행", "제주", "2026-06-12T15:00:00+09:00");
const events = [wedding, jeju];
const eventsById = indexEventsById(events);
const graph = buildExperienceGraphFromEvents(events);

const clusters = projectPinClustersFromGraph({
  volumes: graph.volumes,
  eventsById,
});

assert.equal(clusters.length, 2);
const weddingCluster = findPinClusterByEventId(clusters, "ec-wedding");
assert.ok(weddingCluster);
assert.equal(weddingCluster!.title, "민수 결혼식");
assert.equal(weddingCluster!.evidence.photoCount, 12);
assert.equal(weddingCluster!.evidence.chatCount, 4);
assert.equal(formatPinDateLabel("2027-04-12T15:00:00+09:00"), "2027.04.12");

const classified = projectPinClusterClassifiedPins(clusters);
assert.equal(classified.length, 2);
assert.equal(classified[0]!.pinShape, "slot");

assert.equal(
  buildGlobeFeedHref({ eventId: "ec-wedding" }),
  "/?recallEvent=ec-wedding",
);

console.log("test-pin-clusters: ok");
