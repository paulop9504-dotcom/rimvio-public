#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildExperienceGraphFromEvents,
  formatExperienceAxisChips,
  projectEventToExperienceVolume,
  resolveExperienceQuery,
} from "../lib/experience-graph";
import type { EventCandidate } from "../lib/events/event-candidate";
import { readPlanContextFromEvent } from "../lib/plan-context/plan-context-metadata";

const jeju: EventCandidate = {
  id: "ev-jeju",
  title: "제주 여행",
  category: "travel",
  source: "peer_chat",
  lifecycle: "active",
  datetime: "2026-06-12T09:00:00+09:00",
  place: "제주도",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planWindowEndIso: "2026-06-15T18:00:00+09:00",
    planNights: 3,
    planPeerDisplayName: "민수",
  },
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const busan: EventCandidate = {
  id: "ev-busan",
  title: "부산 여행",
  category: "travel",
  source: "manual",
  lifecycle: "scheduled",
  datetime: "2026-07-01T10:00:00+09:00",
  place: "부산",
  confidence: 0.8,
  metadata: {},
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const volume = projectEventToExperienceVolume(jeju);
assert.ok(volume);
assert.equal(volume!.id, "ev:ev-jeju");
assert.equal(volume!.space.clusterId, "제주도");
assert.ok(volume!.peaks.length >= 2);
assert.equal(volume!.eventType, "travel");
assert.ok(volume!.activeLens);

const plan = readPlanContextFromEvent(jeju);
assert.ok(plan);

const chips = formatExperienceAxisChips(volume!);
assert.equal(chips.length, 3);
assert.match(chips[0]!.label, /시간/);
assert.match(chips[1]!.label, /지도/);
assert.match(chips[2]!.label, /공간/);

const romantic = resolveExperienceQuery({
  volume: volume!,
  query: "제주도에서 가장 낭만 있던 순간",
});
assert.equal(romantic.intent, "romantic_moment");
assert.ok(romantic.peak);

const happy = resolveExperienceQuery({
  volume: volume!,
  query: "제주도에서 가장 행복했던 공간",
});
assert.equal(happy.intent, "happiest_space");

const graph = buildExperienceGraphFromEvents([jeju, busan]);
assert.equal(graph.volumes.length, 2);
assert.ok(graph.edges.some((edge) => edge.kind === "path_rhyme"));

console.log("test-experience-graph: ok");
