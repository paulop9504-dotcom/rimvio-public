#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  canSurfaceGpsArrivalRecall,
  markGpsArrivalRecallShown,
  resetGpsArrivalRecallSessionForTests,
} from "../lib/feed/gps-arrival-recall-session";
import { resolveGpsArrivalRecall } from "../lib/feed/resolve-gps-arrival-recall";
import { resolveSpacetimeFeedTarget } from "../lib/feed/resolve-spacetime-feed-target";
import type { GpsPing } from "../lib/location-ping/types";

const groupId = "peer-group-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const pastGermany: EventCandidate = {
  id: "ec-germany-2024",
  title: "독일 여행",
  category: "travel",
  source: "message",
  lifecycle: "completed",
  datetime: "2024-07-01T09:00:00+09:00",
  place: "독일",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planKind: "plan",
    planPeerThreadId: groupId,
    planPeerDisplayName: "A,B,C 단톡",
    planWindowEndIso: "2024-07-10T20:00:00+09:00",
    feedCaptures: [
      {
        id: "cap-1",
        kind: "photo",
        capturedAtIso: "2024-07-03T14:00:00+09:00",
      },
    ],
  },
  lifecycleUpdatedAt: "2024-07-11T00:00:00.000Z",
  createdAt: "2024-07-01T00:00:00.000Z",
  updatedAt: "2024-07-11T00:00:00.000Z",
};

const activeGermanyPlan: EventCandidate = {
  id: "ec-germany-2026",
  title: "독일 10일 여행",
  category: "travel",
  source: "message",
  lifecycle: "active",
  datetime: "2026-06-01T09:00:00+09:00",
  place: "독일",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planKind: "plan",
    planPeerThreadId: groupId,
    planPeerDisplayName: "A,B,C",
    planWindowEndIso: "2026-06-10T20:00:00+09:00",
  },
  lifecycleUpdatedAt: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const travelArrivalPings: GpsPing[] = [
  {
    id: "ping-seoul",
    lat: 37.566,
    lng: 126.978,
    accuracyM: 20,
    capturedAtIso: "2026-06-05T08:00:00.000Z",
    source: "periodic",
  },
  {
    id: "ping-berlin",
    lat: 52.52,
    lng: 13.405,
    accuracyM: 18,
    capturedAtIso: "2026-06-05T14:30:00.000Z",
    source: "periodic",
  },
];

const recall = resolveGpsArrivalRecall({
  pings: travelArrivalPings,
  events: [pastGermany, activeGermanyPlan],
  now: new Date("2026-06-05T15:00:00.000Z"),
});
assert.ok(recall);
assert.equal(recall!.trigger, "plan_arrival_memory");
assert.equal(recall!.recallEventId, "ec-germany-2024");
assert.equal(recall!.surfaceEventId, "ec-germany-2026");
assert.match(recall!.recallLine, /도착/);
assert.match(recall!.recallLine, /독일/);

const noRecallFar = resolveGpsArrivalRecall({
  pings: travelArrivalPings.slice(0, 1),
  events: [pastGermany, activeGermanyPlan],
});
assert.equal(noRecallFar, null);

resetGpsArrivalRecallSessionForTests();
assert.equal(canSurfaceGpsArrivalRecall("독일"), true);
markGpsArrivalRecallShown("독일", new Date("2026-06-05T15:00:00.000Z"));
assert.equal(canSurfaceGpsArrivalRecall("독일", new Date("2026-06-05T16:00:00.000Z")), false);

const spacetimeTarget = resolveSpacetimeFeedTarget({
  capturedAtIso: "2026-06-05T14:40:00.000Z",
  lat: 52.52,
  lng: 13.405,
  placeLabel: "베를린",
  events: [pastGermany, activeGermanyPlan],
});
assert.equal(spacetimeTarget?.eventId, "ec-germany-2026");

console.log("test-gps-arrival-recall: ok");
