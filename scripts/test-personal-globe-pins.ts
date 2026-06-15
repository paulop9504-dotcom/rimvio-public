#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { createPersonalGlobePinFromEvent } from "../lib/globe/create-personal-globe-pin";
import { listPersonalGlobePinsForViewer } from "../lib/globe/list-pins-for-viewer";
import {
  findPersonalGlobePinByEventId,
  resetPersonalGlobePinsForTests,
} from "../lib/globe/personal-globe-pin-store";
import { projectPersonalGlobeClassifiedPins } from "../lib/globe/project-personal-globe-pins";

const groupId = "peer-group-abc-abc-abc-abc-abc-abc-abc-abc";
const friendId = "peer-dm-friend-friend-friend-fri";

const wedding: EventCandidate = {
  id: "ec-wedding-demo",
  title: "민수 결혼식",
  category: "travel",
  source: "message",
  lifecycle: "completed",
  datetime: "2025-04-16T15:00:00+09:00",
  place: "서울",
  confidence: 0.9,
  metadata: {
    feedPlanEnabled: true,
    planPeerThreadId: groupId,
    feedCaptures: Array.from({ length: 50 }, (_, index) => ({
      id: `photo-${index}`,
      kind: "photo",
      capturedAtIso: "2025-04-16T16:00:00+09:00",
    })).concat(
      Array.from({ length: 3 }, (_, index) => ({
        id: `video-${index}`,
        kind: "video",
        capturedAtIso: "2025-04-16T17:00:00+09:00",
      })),
    ),
  },
  lifecycleUpdatedAt: "2025-04-17T00:00:00.000Z",
  createdAt: "2025-04-16T00:00:00.000Z",
  updatedAt: "2025-04-17T00:00:00.000Z",
};

resetPersonalGlobePinsForTests();

const first = createPersonalGlobePinFromEvent({
  event: wedding,
  shareWithPeerThreadIds: [groupId],
});
assert.equal(first.created, true);
assert.equal(first.pin.photoCount, 50);
assert.equal(first.pin.videoCount, 3);

const again = createPersonalGlobePinFromEvent({ event: wedding });
assert.equal(again.created, false);

const ownerPins = listPersonalGlobePinsForViewer(
  [first.pin],
  { isOwner: true },
);
assert.equal(ownerPins.length, 1);

const groupViewer = listPersonalGlobePinsForViewer(
  [first.pin],
  { isOwner: false, viewerPeerThreadId: groupId },
);
assert.equal(groupViewer.length, 1);

const stranger = listPersonalGlobePinsForViewer(
  [first.pin],
  { isOwner: false, viewerPeerThreadId: friendId },
);
assert.equal(stranger.length, 0);

const classified = projectPersonalGlobeClassifiedPins(
  { isOwner: true },
  [findPersonalGlobePinByEventId("ec-wedding-demo")!],
);
assert.equal(classified[0]?.pinShape, "slot");
assert.equal(classified[0]?.slot?.photoCount, 50);
assert.equal(classified[0]?.slot?.videoCount, 3);

console.log("test-personal-globe-pins: ok");
