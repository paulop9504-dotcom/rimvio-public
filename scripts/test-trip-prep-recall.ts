#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { findPlanEventForPeerThread } from "../lib/plan-context/find-plan-event-for-peer-thread";
import { resolveTripPrepRecall } from "../lib/plan-context/resolve-trip-prep-recall";
import { resolveTargetEventFromSpacetime } from "../lib/feed/resolve-target-event-from-spacetime";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

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

const activeFrancePlan: EventCandidate = {
  id: "ec-france-2026",
  title: "프랑스 여행",
  category: "travel",
  source: "message",
  lifecycle: "active",
  datetime: "2026-08-01T09:00:00+09:00",
  place: "프랑스",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planKind: "plan",
    planPeerThreadId: "peer-group-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    planWindowEndIso: "2026-08-08T20:00:00+09:00",
  },
  lifecycleUpdatedAt: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

resetEventCandidatesForTests();

const recall = resolveTripPrepRecall({
  title: "독일 10일 여행",
  place: "독일",
  peerDisplayName: "A,B,C",
  events: [pastGermany, activeFrancePlan],
});
assert.ok(recall);
assert.equal(recall?.hit.eventId, "ec-germany-2024");
assert.match(recall!.recallLine, /독일/);
assert.ok(recall!.feedHref.includes("ec-germany-2024"));

const noRecall = resolveTripPrepRecall({
  title: "금요일 저녁 약속",
  place: "강남역",
  events: [pastGermany],
});
assert.equal(noRecall, null);

const planHit = findPlanEventForPeerThread(
  [pastGermany, activeFrancePlan],
  groupId,
);
assert.equal(planHit?.id, "ec-germany-2024");

const target = resolveTargetEventFromSpacetime({
  capturedAtIso: "2024-07-04T12:00:00+09:00",
  lat: 52.52,
  lng: 13.405,
  placeLabel: "베를린",
  peerThreadId: groupId,
  events: [pastGermany],
});
assert.equal(target.event.id, "ec-germany-2024");
assert.equal(target.createdNewEvent, false);

console.log("test-trip-prep-recall: ok");
