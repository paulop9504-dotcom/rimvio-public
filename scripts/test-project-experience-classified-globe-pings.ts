#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildExperienceGraphFromEvents } from "../lib/experience-graph/build-experience-graph";
import { projectExperienceClassifiedGlobePings } from "../lib/feed/project-experience-classified-globe-pings";

const event: EventCandidate = {
  id: "evt-jeju",
  title: "제주 여행",
  category: "travel",
  source: "chat",
  lifecycle: "active",
  datetime: "2026-06-01T10:00:00.000Z",
  place: "제주",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planPeerDisplayName: "민수",
    planWindowEndIso: "2026-06-03T10:00:00.000Z",
  },
  lifecycleUpdatedAt: "2026-06-01T10:00:00.000Z",
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-02T11:00:00.000Z",
};

const graph = buildExperienceGraphFromEvents([event]);
const volume = graph.volumes[0]!;

const pins = projectExperienceClassifiedGlobePings({
  volume,
  event,
  gpsPings: [
    {
      id: "ping-1",
      lat: 33.4996,
      lng: 126.5312,
      accuracyM: 12,
      capturedAtIso: "2026-06-02T11:30:00.000Z",
      source: "periodic",
    },
  ],
});

assert.ok(pins.some((pin) => pin.kind === "photo"));
assert.ok(pins.some((pin) => pin.kind === "gps"));

console.log("✓ project-experience-classified-globe-pings");
