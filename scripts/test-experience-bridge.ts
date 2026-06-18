#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  acceptBridgeInvite,
  buildBridgeSnapshot,
  buildHostParticipant,
  canEditBridgeMedia,
  canExportBridgeMedia,
  canReadBridgeExperience,
  createInitialBridgeState,
  declineBridgeInvite,
  ensureBridgeParticipantPin,
  EXPERIENCE_BRIDGE_MAX_PARTICIPANTS,
  inviteBridgeParticipant,
  leaveBridgeExperience,
  mergeBridgeTimeline,
} from "../lib/experience-bridge";
import { resetPersonalGlobePinsForTests } from "../lib/globe/personal-globe-pin-store";
import { PEER_GLOBE_PIN_PAYLOAD_KIND } from "../lib/peer-chat/globe-pin-types";
import type { SharedGlobePin } from "../lib/peer-chat/globe-pin-types";

function baseEvent(): EventCandidate {
  return {
    id: "ev-bridge-jeju",
    title: "제주 여행",
    category: "travel",
    source: "manual",
    lifecycle: "active",
    confidence: 0.9,
    lifecycleUpdatedAt: "2026-06-10T08:00:00.000Z",
    createdAt: "2026-06-10T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
    place: "제주",
    metadata: {
      feedCaptures: [
        {
          id: "cap-a1",
          kind: "photo",
          capturedAtIso: "2026-06-10T09:00:00.000Z",
          url: "https://example.com/a.jpg",
          ownerUserId: "user-a",
          authorDisplayName: "민수",
        },
      ],
    },
  };
}

const sharedPin: SharedGlobePin = {
  messageId: "msg-b1",
  peerThreadId: "thread-jeju",
  senderUserId: "user-b",
  sentAt: "2026-06-10T10:00:00.000Z",
  payload: {
    kind: PEER_GLOBE_PIN_PAYLOAD_KIND,
    pinId: "pin-b1",
    lat: 33.4,
    lng: 126.5,
    placeLabel: "제주",
    senderDisplayName: "지연",
    capturedAtIso: "2026-06-10T10:00:00.000Z",
    imageUrl: "https://example.com/b.jpg",
    mediaKind: "photo",
  },
};

resetPersonalGlobePinsForTests();

const event = baseEvent();
const bridge = buildBridgeSnapshot({
  event,
  hostUserId: "user-a",
  peerThreadId: "thread-jeju",
});

let state = createInitialBridgeState({
  bridge,
  hostDisplayName: "민수",
});

state = inviteBridgeParticipant(state, {
  userId: "user-b",
  displayName: "지연",
});
assert.equal(state.participants.length, 2);
assert.equal(state.participants[1]?.status, "pending");

state = acceptBridgeInvite(state, { userId: "user-b" });
assert.equal(state.participants[1]?.status, "accepted");

assert.ok(
  canReadBridgeExperience({ viewerUserId: "user-b", participants: state.participants }),
);
assert.ok(
  !canEditBridgeMedia({ viewerUserId: "user-b", ownerUserId: "user-a" }),
);
assert.ok(
  canExportBridgeMedia({ viewerUserId: "user-a", ownerUserId: "user-a" }),
);
assert.ok(
  !canExportBridgeMedia({ viewerUserId: "user-b", ownerUserId: "user-a" }),
);

const timeline = mergeBridgeTimeline({
  bridge: state.bridge,
  sharedPins: [sharedPin],
  viewerUserId: "user-b",
  hostDisplayName: "민수",
});
assert.equal(timeline.length, 2);
assert.equal(timeline[0]?.viewOnly, true);
assert.equal(timeline[1]?.viewOnly, false);

const pin = ensureBridgeParticipantPin({ bridge: state.bridge });
assert.equal(pin.eventId, event.id);
assert.equal(pin.experienceTitle, "제주 여행");

state = leaveBridgeExperience(state, { userId: "user-b" });
assert.equal(state.participants[1]?.status, "left");
assert.ok(
  !canReadBridgeExperience({ viewerUserId: "user-b", participants: state.participants }),
);

let capState = createInitialBridgeState({ bridge, hostDisplayName: "민수" });
for (let i = 0; i < EXPERIENCE_BRIDGE_MAX_PARTICIPANTS - 1; i += 1) {
  capState = inviteBridgeParticipant(capState, {
    userId: `user-${i}`,
    displayName: `guest-${i}`,
  });
}
assert.throws(
  () =>
    inviteBridgeParticipant(capState, {
      userId: "user-overflow",
      displayName: "overflow",
    }),
  /participant_cap/,
);

let declineState = inviteBridgeParticipant(
  createInitialBridgeState({ bridge, hostDisplayName: "민수" }),
  { userId: "user-c", displayName: "현우" },
);
declineState = declineBridgeInvite(declineState, { userId: "user-c" });
assert.equal(declineState.participants[1]?.status, "declined");

assert.ok(buildHostParticipant({ hostUserId: "user-a", displayName: "민수" }).role === "host");

console.log("test-experience-bridge: ok");
