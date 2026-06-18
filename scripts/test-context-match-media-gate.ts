#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { evaluateContextMatchMedia } from "../lib/ingest/context-match-media-gate";
import type { MediaSpacetimeContext } from "../lib/location-ping/types";

const groupId = "peer-group-abc-abc-abc-abc-abc-abc-abc-abc";

const germanyPlan: EventCandidate = {
  id: "ec-germany-active",
  title: "독일 10일 여행",
  category: "travel",
  source: "message",
  lifecycle: "active",
  datetime: "2026-06-01T09:00:00+09:00",
  place: "독일",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planPeerThreadId: groupId,
    planWindowStartIso: "2026-06-01T09:00:00+09:00",
    planWindowEndIso: "2026-06-10T20:00:00+09:00",
  },
  lifecycleUpdatedAt: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

function ctx(partial: Partial<MediaSpacetimeContext>): MediaSpacetimeContext {
  return {
    id: "mc-test",
    capturedAtIso: "2026-06-05T14:00:00+09:00",
    lat: 52.52,
    lng: 13.405,
    accuracyM: 20,
    placeLabel: "독일",
    resolveSource: "exif_datetime",
    matchedPingId: null,
    mediaKind: "photo",
    origin: "peer_chat",
    originRef: groupId,
    fileName: "wedding.jpg",
    attachedAtIso: "2026-06-05T14:00:00+09:00",
    ...partial,
  };
}

const planHit = evaluateContextMatchMedia({
  context: ctx({ origin: "peer_chat" }),
  peerThreadId: groupId,
  events: [germanyPlan],
});
assert.equal(planHit.allow, true);
assert.equal(planHit.signal, "plan_peer");

const commute = evaluateContextMatchMedia({
  context: ctx({
    capturedAtIso: "2026-06-05T08:00:00+09:00",
    lat: 37.566,
    lng: 126.978,
    placeLabel: null,
    resolveSource: "file_mtime",
    origin: "other",
  }),
  events: [germanyPlan],
});
assert.equal(commute.allow, false);
assert.match(commute.reason, /맥락|일상/);

const confirm = evaluateContextMatchMedia({
  context: ctx({ origin: "other", placeLabel: null, lat: null, lng: null }),
  userConfirmedTarget: true,
  events: [],
});
assert.equal(confirm.allow, true);
assert.equal(confirm.signal, "user_confirm");

console.log("test-context-match-media-gate: ok");
