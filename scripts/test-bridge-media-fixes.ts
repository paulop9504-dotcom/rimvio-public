#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { patchFeedCaptureRemoteUrl } from "../lib/feed/feed-capture-metadata";
import { projectContextMediaReel } from "../lib/globe/project-context-media-reel";
import { resetMediaContextStoreForTests } from "../lib/location-ping/media-context-store";
import {
  resetShareVideoCompressSerialForTests,
  runShareVideoCompressSerial,
} from "../lib/media/share-video-compress/run-share-video-compress-serial";

resetShareVideoCompressSerialForTests();

void (async () => {
  let serial = 0;
  const order: number[] = [];
  await Promise.all([
    runShareVideoCompressSerial(async () => {
      order.push(1);
      await new Promise((r) => setTimeout(r, 30));
      serial += 1;
    }),
    runShareVideoCompressSerial(async () => {
      order.push(2);
      await new Promise((r) => setTimeout(r, 5));
      serial += 1;
    }),
  ]);
  assert.deepEqual(order, [1, 2]);
  assert.equal(serial, 2);

const event: EventCandidate = {
  id: "evt-dedupe",
  title: "테스트",
  category: "travel",
  source: "manual",
  lifecycle: "completed",
  datetime: "2026-01-05T10:00:00+09:00",
  place: "서울",
  confidence: 0.9,
  metadata: {
    feedCaptures: [
      {
        id: "cap-1",
        kind: "video",
        capturedAtIso: "2026-01-05T12:00:00+09:00",
        mediaContextId: "mc-1",
        url: "https://cdn.example.com/v.mp4",
      },
    ],
  },
  lifecycleUpdatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

resetMediaContextStoreForTests([
  {
    id: "mc-1",
    mediaKind: "video",
    capturedAtIso: "2026-01-05T12:00:00+09:00",
    originRef: "evt-dedupe",
    lat: 37.5,
    lng: 127.0,
    placeLabel: "서울",
  },
]);

const reel = projectContextMediaReel({ event, volume: null });
assert.equal(reel.length, 1);
assert.equal(reel[0]?.imageUrl, "https://cdn.example.com/v.mp4");

const patched = patchFeedCaptureRemoteUrl({
  event,
  captureId: "cap-1",
  url: "https://cdn.example.com/new.mp4",
});
assert.equal(
  patched?.metadata?.feedCaptures?.[0]?.url,
  "https://cdn.example.com/new.mp4",
);

console.log("test-bridge-media-fixes: ok");
})();
