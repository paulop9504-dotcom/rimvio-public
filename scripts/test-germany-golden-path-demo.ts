#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { resolveGpsArrivalRecall } from "../lib/feed/resolve-gps-arrival-recall";
import {
  buildGermanyGoldenPathDrafts,
  GERMANY_GOLDEN_ACTIVE_EVENT_ID,
  GERMANY_GOLDEN_PAST_EVENT_ID,
} from "../lib/feed/seed-germany-golden-path-demo";
import { hasPendingFeedCaptureVerify } from "../lib/feed/feed-capture-metadata";
import { resolveTripPrepRecall } from "../lib/plan-context/resolve-trip-prep-recall";
import type { GpsPing } from "../lib/location-ping/types";

const now = new Date("2026-06-05T15:00:00.000Z");
const { past, active } = buildGermanyGoldenPathDrafts(now);

assert.equal(past.id, GERMANY_GOLDEN_PAST_EVENT_ID);
assert.equal(active.id, GERMANY_GOLDEN_ACTIVE_EVENT_ID);
assert.equal(hasPendingFeedCaptureVerify(active), true);

const prepRecall = resolveTripPrepRecall({
  title: active.title,
  place: active.place,
  peerDisplayName: "A,B,C",
  events: [past, active],
  excludeEventId: active.id,
});
assert.equal(prepRecall?.hit.eventId, GERMANY_GOLDEN_PAST_EVENT_ID);

const pings: GpsPing[] = [
  {
    id: "p1",
    lat: 37.566,
    lng: 126.978,
    accuracyM: 20,
    capturedAtIso: "2026-06-05T08:00:00.000Z",
    source: "periodic",
  },
  {
    id: "p2",
    lat: 52.52,
    lng: 13.405,
    accuracyM: 18,
    capturedAtIso: "2026-06-05T14:30:00.000Z",
    source: "periodic",
  },
];

resetEventCandidatesForTests();
const arrival = resolveGpsArrivalRecall({
  pings,
  events: [past, active],
  now,
});
assert.equal(arrival?.trigger, "plan_arrival_memory");
assert.equal(arrival?.recallEventId, GERMANY_GOLDEN_PAST_EVENT_ID);
assert.equal(arrival?.surfaceEventId, GERMANY_GOLDEN_ACTIVE_EVENT_ID);

console.log("test-germany-golden-path-demo: ok");
