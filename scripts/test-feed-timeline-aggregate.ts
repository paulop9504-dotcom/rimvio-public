import assert from "node:assert/strict";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildFeedTimelineAggregate } from "@/lib/feed/build-feed-timeline-aggregate";
import { formatFeedTimelineAggregateLine } from "@/lib/feed/format-feed-timeline-aggregate";
import { projectDwellMinutesFromGpsPings } from "@/lib/feed/project-dwell-from-gps-pings";
import { resetGpsPingStoreForTests } from "@/lib/location-ping/gps-ping-store";

function eventStub(): EventCandidate {
  const stamp = "2026-06-06T12:00:00.000Z";
  return {
    id: "jeju-day2",
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    datetime: "2026-06-11T09:00:00+09:00",
    place: "제주",
    confidence: 0.9,
    metadata: {
      feedCaptures: [
        {
          id: "p1",
          kind: "photo",
          capturedAtIso: "2026-06-11T10:00:00+09:00",
        },
        {
          id: "p2",
          kind: "photo",
          capturedAtIso: "2026-06-11T11:00:00+09:00",
        },
        {
          id: "l1",
          kind: "link",
          capturedAtIso: "2026-06-11T12:00:00+09:00",
          url: "https://example.com",
        },
      ],
      feedCaptureStats: { photos: 2, videos: 0, links: 1, memos: 0 },
    },
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function testAggregateWithFriends() {
  const aggregate = buildFeedTimelineAggregate({
    event: eventStub(),
    plan: {
      planId: "jeju-day2",
      title: "제주 여행",
      windowStartIso: "2026-06-10T15:00:00+09:00",
      windowEndIso: "2026-06-12T19:00:00+09:00",
      windowConfidence: "confirmed",
      nights: 2,
      place: "제주",
      peerDisplayName: "민수",
      peerThreadId: "peer-1",
      attachMode: "new",
      planMode: "group",
    },
    peers: [
      {
        peerThreadId: "peer-2",
        displayName: "지연",
        avatarUrl: null,
        rimvioId: null,
        emailLower: null,
        source: "plan_metadata",
      },
    ],
  });

  assert.equal(aggregate.photos, 2);
  assert.equal(aggregate.links, 1);
  assert.equal(aggregate.friendCount, 2);
  assert.equal(aggregate.hasContent, true);

  const line = formatFeedTimelineAggregateLine(aggregate);
  assert.ok(line?.includes("📷 2"));
  assert.ok(line?.includes("링크 1"));
  assert.ok(line?.includes("친구 2"));
}

function testDwellProjection() {
  resetGpsPingStoreForTests([
    {
      id: "g1",
      lat: 33.46,
      lng: 126.31,
      accuracyM: 10,
      capturedAtIso: "2026-06-11T10:00:00+09:00",
      source: "periodic",
    },
    {
      id: "g2",
      lat: 33.461,
      lng: 126.312,
      accuracyM: 10,
      capturedAtIso: "2026-06-11T10:12:00+09:00",
      source: "periodic",
    },
    {
      id: "g3",
      lat: 33.462,
      lng: 126.313,
      accuracyM: 10,
      capturedAtIso: "2026-06-11T10:36:00+09:00",
      source: "periodic",
    },
  ]);

  const dwell = projectDwellMinutesFromGpsPings({
    pings: [
      {
        id: "g1",
        lat: 33.46,
        lng: 126.31,
        accuracyM: 10,
        capturedAtIso: "2026-06-11T10:00:00+09:00",
        source: "periodic",
      },
      {
        id: "g2",
        lat: 33.461,
        lng: 126.312,
        accuracyM: 10,
        capturedAtIso: "2026-06-11T10:12:00+09:00",
        source: "periodic",
      },
      {
        id: "g3",
        lat: 33.462,
        lng: 126.313,
        accuracyM: 10,
        capturedAtIso: "2026-06-11T10:36:00+09:00",
        source: "periodic",
      },
    ],
    windowStartIso: "2026-06-11T09:00:00+09:00",
    windowEndIso: "2026-06-12T19:00:00+09:00",
    placeLabel: "제주",
  });

  assert.ok(dwell !== null && dwell >= 5);
}

testAggregateWithFriends();
testDwellProjection();
console.log("test-feed-timeline-aggregate: ok");
