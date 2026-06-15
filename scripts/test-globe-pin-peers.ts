#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import { buildFeedSlotPeerLookup } from "../lib/feed/build-feed-slot-peer-lookup";
import {
  enrichClassifiedGlobePinPeers,
  projectGlobePinPeersFromEvent,
  readGlobePinPeerSeedsFromEvent,
} from "../lib/globe/project-globe-pin-peers";
import { projectPinClusterClassifiedPins } from "../lib/globe/project-pin-clusters";
import { indexEventsById } from "../lib/plan-context/project-plan-to-feed-slot";

const stamp = new Date().toISOString();
const event: EventCandidate = {
  id: "ec-starbucks",
  title: "내일 1시 스타벅스에서 만나 약속",
  category: "social",
  source: "message",
  lifecycle: "scheduled",
  datetime: "2026-06-07T13:00:00+09:00",
  place: "장안면",
  confidence: 0.9,
  metadata: {
    planPeerDisplayName: "수연",
    planPeerThreadId: "peer-suyeon",
    experiencePeerNames: ["수연"],
  },
  lifecycleUpdatedAt: stamp,
  createdAt: stamp,
  updatedAt: stamp,
};

const seeds = readGlobePinPeerSeedsFromEvent(event);
assert.equal(seeds.length, 1);
assert.equal(seeds[0]!.displayName, "수연");

const lookup = buildFeedSlotPeerLookup({
  messages: [],
  relationshipSlots: [
    {
      slotId: "slot-1",
      roomId: "peer-suyeon",
      friendId: "friend-1",
      displayName: "수연",
      rimvioId: "suyeon",
      avatarUrl: "https://example.com/suyeon.jpg",
      lastMessage: null,
      lastActivityAt: stamp,
      unreadCount: 0,
      isPinned: false,
    },
  ],
});

const peers = projectGlobePinPeersFromEvent(event, lookup);
assert.equal(peers.length, 1);
assert.equal(peers[0]!.avatarUrl, "https://example.com/suyeon.jpg");

const eventsById = indexEventsById([event]);
const classified = enrichClassifiedGlobePinPeers(
  projectPinClusterClassifiedPins(
    [
      {
        pinId: "pcluster:ec-starbucks",
        eventId: event.id,
        title: event.title,
        placeLabel: "장안면",
        lat: 37.2,
        lng: 127.1,
        dateLabel: "2026.06.07",
        startedAtIso: event.datetime ?? null,
        evidence: { photoCount: 0, videoCount: 0, chatCount: 1, placePinCount: 1 },
        recallLine: null,
      },
    ],
    eventsById,
  ),
  eventsById,
  lookup,
);

assert.equal(classified[0]!.peers?.length, 1);
assert.equal(classified[0]!.peers?.[0]!.displayName, "수연");

console.log("test-globe-pin-peers: ok");
