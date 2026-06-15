import assert from "node:assert/strict";
import {
  globeContextShouldMapReplayFirst,
  resolveGlobeContextPrimaryVideo,
  resolveGlobeContextPrimaryVideoForMap,
} from "../lib/globe/resolve-globe-context-primary-video";
import { resetMediaContextStoreForTests } from "../lib/location-ping/media-context-store";
import type { EventCandidate } from "../lib/events/event-candidate";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  const stamp = "2026-06-10T03:00:00.000Z";
  return {
    id: "evt:test",
    title: "테스트",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    datetime: "2026-06-10T10:00:00+09:00",
    confidence: 0.8,
    metadata: {},
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

function testLatestVideoWins() {
  const event = baseEvent({
    metadata: {
      feedCaptures: [
        {
          id: "cap:photo",
          kind: "photo",
          capturedAtIso: "2026-06-10T12:00:00+09:00",
          mediaContextId: "media:photo:1",
        },
        {
          id: "cap:video-old",
          kind: "video",
          capturedAtIso: "2026-06-10T11:00:00+09:00",
          mediaContextId: "media:video:old",
          label: "오래된 영상",
        },
        {
          id: "cap:video-new",
          kind: "video",
          capturedAtIso: "2026-06-10T13:00:00+09:00",
          mediaContextId: "media:video:new",
          label: "최신 영상",
        },
      ],
    },
  });

  const resolved = resolveGlobeContextPrimaryVideo(event);
  assert.ok(resolved);
  assert.equal(resolved!.mediaContextId, "media:video:new");
  assert.equal(resolved!.label, "최신 영상");
}

function testNoVideoReturnsNull() {
  const event = baseEvent({
    metadata: {
      feedCaptures: [
        {
          id: "cap:photo",
          kind: "photo",
          capturedAtIso: "2026-06-10T12:00:00+09:00",
          mediaContextId: "media:photo:1",
        },
      ],
    },
  });
  assert.equal(resolveGlobeContextPrimaryVideo(event), null);
}

function testMediaStoreFallback() {
  resetMediaContextStoreForTests([
    {
      id: "media:video:wedding",
      mediaKind: "video",
      capturedAtIso: "2026-09-20T14:00:00+09:00",
      lat: 37.56,
      lng: 126.97,
      placeLabel: "서울",
      origin: "feed_capture",
      originRef: "schedule:hidden-wedding",
    },
  ]);

  const event = baseEvent({
    id: "schedule:hidden-wedding",
    metadata: {},
  });

  const resolved = resolveGlobeContextPrimaryVideo(event);
  assert.ok(resolved);
  assert.equal(resolved!.mediaContextId, "media:video:wedding");
}

function testMapReplayGateUsesFeedCaptureVideoWithoutMediaId() {
  const event = baseEvent({
    metadata: {
      feedCaptures: [
        {
          id: "cap:video",
          kind: "video",
          capturedAtIso: "2026-06-10T12:00:00+09:00",
          label: "영상만",
        },
      ],
    },
  });
  assert.equal(resolveGlobeContextPrimaryVideo(event), null);
  assert.equal(globeContextShouldMapReplayFirst({ event }), true);
}

function testMapReplayUsesReelVideoWithMediaId() {
  const event = baseEvent({
    metadata: {
      feedCaptures: [
        {
          id: "cap:video",
          kind: "video",
          capturedAtIso: "2026-06-10T12:00:00+09:00",
          mediaContextId: "media:video:reel",
          label: "릴 영상",
        },
      ],
    },
  });
  const resolved = resolveGlobeContextPrimaryVideoForMap({ event, volume: null });
  assert.ok(resolved);
  assert.equal(resolved!.mediaContextId, "media:video:reel");
}

testLatestVideoWins();
testNoVideoReturnsNull();
testMediaStoreFallback();
testMapReplayGateUsesFeedCaptureVideoWithoutMediaId();
testMapReplayUsesReelVideoWithMediaId();
console.log("test-globe-context-primary-video: ok");
