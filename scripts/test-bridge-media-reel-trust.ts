#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { dedupeBridgeFeedCaptures } from "../lib/experience-bridge/dedupe-bridge-feed-captures";
import {
  isBridgeCapturePendingRemote,
  shouldAppendMediaStoreForBridgeReel,
  shouldShowBridgeCaptureInReel,
} from "../lib/globe/bridge-context-media-reel-policy";
import { projectContextMediaReel } from "../lib/globe/project-context-media-reel";
import { resetMediaContextStoreForTests } from "../lib/location-ping/media-context-store";

assert.equal(shouldAppendMediaStoreForBridgeReel(true), false);
assert.equal(shouldAppendMediaStoreForBridgeReel(false), true);

assert.equal(
  isBridgeCapturePendingRemote({
    bridgeShared: true,
    imageUrl: null,
    allowLocalBlob: false,
    capture: { ownerUserId: "friend" },
    viewerUserId: "me",
  }),
  true,
);
assert.equal(
  isBridgeCapturePendingRemote({
    bridgeShared: true,
    imageUrl: null,
    allowLocalBlob: false,
    capture: { ownerUserId: "me" },
    viewerUserId: "me",
  }),
  false,
);

assert.equal(
  shouldShowBridgeCaptureInReel({
    capture: { ownerUserId: "friend" },
    imageUrl: "https://cdn.example.com/a.jpg",
    allowLocalBlob: false,
    viewerUserId: "me",
  }),
  true,
);
assert.equal(
  shouldShowBridgeCaptureInReel({
    capture: { ownerUserId: "friend" },
    imageUrl: null,
    allowLocalBlob: false,
    viewerUserId: "me",
  }),
  false,
);

const deduped = dedupeBridgeFeedCaptures([
  {
    id: "a",
    kind: "photo",
    capturedAtIso: "2026-01-01T00:00:00.000Z",
    url: "https://cdn.example.com/same.jpg",
  },
  {
    id: "b",
    kind: "photo",
    capturedAtIso: "2026-01-02T00:00:00.000Z",
    url: "https://cdn.example.com/same.jpg",
  },
]);
assert.equal(deduped.length, 1);

resetMediaContextStoreForTests([
  {
    id: "leak-blob",
    mediaKind: "photo",
    capturedAtIso: "2026-01-06T10:00:00+09:00",
    originRef: "evt-bridge-trust",
    lat: 33.4,
    lng: 126.5,
    placeLabel: "제주",
  },
]);

const bridgeEvent: EventCandidate = {
  id: "evt-bridge-trust",
  title: "제주",
  category: "travel",
  source: "manual",
  lifecycle: "active",
  confidence: 0.9,
  lifecycleUpdatedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  metadata: {
    experienceBridgeParticipant: true,
    feedCaptures: [
      {
        id: "remote-only",
        kind: "photo",
        capturedAtIso: "2026-01-05T10:00:00+09:00",
        url: "https://cdn.example.com/friend.jpg",
        ownerUserId: "friend",
      },
    ],
  },
};

const reel = projectContextMediaReel({
  event: bridgeEvent,
  volume: null,
  viewerUserId: "me",
});
assert.equal(reel.length, 1);
assert.equal(reel[0]?.imageUrl, "https://cdn.example.com/friend.jpg");
assert.ok(!reel.some((row) => row.mediaContextId === "leak-blob"));

console.log("test-bridge-media-reel-trust: ok");
