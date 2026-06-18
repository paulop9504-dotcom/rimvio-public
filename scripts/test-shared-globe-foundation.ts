#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { FeedCaptureFragment } from "../lib/feed/feed-capture-types";
import { projectExperienceRoom } from "../lib/experience-room";
import {
  applySharedGlobePin,
  buildSharedGlobeFoundationPin,
  buildSharedGlobeLayer,
  createEmptySharedGlobe,
  evaluateSharedGlobeAutoCreate,
  inviteSharedGlobeMember,
  projectSharedGlobe,
  resolveSharedGlobeId,
  resolveSharedGlobeProjection,
  tryAutoCreateSharedGlobe,
} from "../lib/shared-globe";
import { PEER_GLOBE_PIN_PAYLOAD_KIND } from "../lib/peer-chat/globe-pin-types";
import type { SharedGlobePin } from "../lib/peer-chat/globe-pin-types";

function baseEvent(overrides: Partial<EventCandidate>): EventCandidate {
  return {
    id: "ev-globe-test",
    title: "민수랑 제주",
    category: "travel",
    source: "message",
    lifecycle: "active",
    confidence: 0.9,
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function captures(rows: Partial<FeedCaptureFragment>[]): FeedCaptureFragment[] {
  return rows.map((row, index) => ({
    id: row.id ?? `cap-${index}`,
    kind: row.kind ?? "photo",
    capturedAtIso: row.capturedAtIso ?? new Date().toISOString(),
    verified: row.verified ?? true,
    ...row,
  }));
}

const groupThread = "peer-group-jeju-abc";
const event = baseEvent({
  id: "ev-jeju-plan",
  metadata: {
    planPeerThreadId: groupThread,
    planPeerDisplayName: "민수",
    attendees: ["지연", "현우", "민수"],
    feedCaptures: captures([
      { id: "c1", verified: true },
      { id: "c2", verified: true },
    ]),
  },
});

const legacyPin: SharedGlobePin = {
  messageId: "msg-1",
  peerThreadId: groupThread,
  senderUserId: "user-a",
  sentAt: "2026-06-06T10:00:00.000Z",
  payload: {
    kind: PEER_GLOBE_PIN_PAYLOAD_KIND,
    pinId: "pin-jeju-1",
    lat: 33.389,
    lng: 126.553,
    placeLabel: "제주",
    senderDisplayName: "민수",
    capturedAtIso: "2026-06-06T10:00:00.000Z",
    imageUrl: "https://example.com/p.jpg",
    mediaKind: "photo",
  },
};

const legacyPinB: SharedGlobePin = {
  ...legacyPin,
  messageId: "msg-2",
  senderUserId: "user-b",
  payload: {
    ...legacyPin.payload,
    pinId: "pin-jeju-2",
    senderDisplayName: "지연",
  },
};

const room = projectExperienceRoom({
  primaryEvent: event,
  globePins: [legacyPin, legacyPinB],
});
assert.equal(room.id, "er:ev-jeju-plan");
assert.ok(room.participants.length >= 3);
assert.ok(room.threadIds.includes(groupThread));

const auto = evaluateSharedGlobeAutoCreate({
  experienceRoom: room,
  primaryEvent: event,
  globePins: [legacyPin, legacyPinB],
});
assert.equal(auto.eligible, true);
assert.ok(auto.memberCount >= 3);
assert.ok(auto.jointVerifierCount >= 2);

const empty = createEmptySharedGlobe({
  primaryEvent: event,
  threadId: groupThread,
  ownerDisplayName: "나",
  ownerUserId: "user-me",
});
assert.equal(empty.globe.isEmpty, true);
assert.equal(empty.globe.id, resolveSharedGlobeId(room.id));
assert.ok(empty.metadataPatch.sharedGlobeId);

let globe = projectSharedGlobe({
  primaryEvent: event,
  threadId: groupThread,
  globePins: [legacyPin, legacyPinB],
});
assert.equal(globe.pins.length, 2);
assert.equal(globe.pins[0]?.author.displayName, "민수");
assert.ok(globe.pins[0]?.captureRef);

globe = inviteSharedGlobeMember(globe, { displayName: "새친구" });
assert.equal(globe.members.length, 4);

const layer = buildSharedGlobeLayer(globe);
assert.equal(layer.layerId, "shared_graph");
assert.ok(layer.recallLine.includes("핀"));

const projection = resolveSharedGlobeProjection({
  primaryEvent: event,
  threadId: groupThread,
  globePins: [legacyPin, legacyPinB],
});
assert.equal(projection.globe.experienceRoomId, room.id);

const autoCreated = tryAutoCreateSharedGlobe({
  experienceRoom: room,
  primaryEvent: event,
  threadId: groupThread,
  ownerDisplayName: "나",
  eligible: true,
});
assert.ok(autoCreated);
assert.ok(autoCreated!.metadataPatch.sharedGlobeId);

const pin = buildSharedGlobeFoundationPin({
  lat: 33.4,
  lng: 126.6,
  placeLabel: "성산",
  author: { userId: "user-me", displayName: "나" },
  captureRef: "cap-new",
});
const withPin = applySharedGlobePin(empty.globe, pin);
assert.equal(withPin.isEmpty, false);
assert.equal(withPin.pins.length, 1);

const blocked = evaluateSharedGlobeAutoCreate({
  experienceRoom: projectExperienceRoom({ primaryEvent: baseEvent({ metadata: { planPeerDisplayName: "민수" } }) }),
  primaryEvent: baseEvent({ metadata: { planPeerDisplayName: "민수" } }),
  globePins: [],
});
assert.equal(blocked.eligible, false);

console.log("--- SharedGlobe ---");
console.log(`id=${globe.id} members=${globe.members.length} pins=${globe.pins.length}`);
console.log(`layer=${layer.recallLine}`);
console.log(`autoCreate eligible=${auto.eligible} verifiers=${auto.jointVerifierCount}`);

console.log("\ntest-shared-globe-foundation: ok");
