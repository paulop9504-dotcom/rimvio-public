#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  buildGlobePinSystemBody,
  isPeerGlobePinPayload,
  PEER_GLOBE_PIN_PAYLOAD_KIND,
} from "../lib/peer-chat/globe-pin-types";
import {
  mapPercentToLatLng,
  projectLatLngToMapPercent,
} from "../lib/experience-graph/resolve-place-coordinates";
import {
  listSharedGlobePinsFromMessages,
  projectSharedGlobeClassifiedPins,
  sharedGlobePinFromMessageRow,
} from "../lib/peer-chat/project-thread-globe-pins";
import { globeViewForSharedPins } from "../lib/peer-chat/globe-view-for-shared-pins";
import { validateGlobePinCoords } from "../lib/peer-chat/server-globe-pins";
import type { PeerMessageRow } from "../lib/peer-chat/types";

const payload = {
  kind: PEER_GLOBE_PIN_PAYLOAD_KIND,
  pinId: "pin-1",
  lat: 33.389,
  lng: 126.553,
  placeLabel: "제주",
  senderDisplayName: "민수",
  capturedAtIso: "2026-06-06T10:00:00.000Z",
};

assert.equal(isPeerGlobePinPayload(payload), true);
assert.equal(isPeerGlobePinPayload({ kind: "other" }), false);

const row: PeerMessageRow = {
  id: "msg-1",
  thread_id: "peer-group-abc",
  sender_user_id: "user-a",
  body: buildGlobePinSystemBody({
    senderDisplayName: "민수",
    placeLabel: "제주",
  }),
  message_type: "system",
  ai_payload: payload,
  image_url: null,
  created_at: "2026-06-06T10:00:00.000Z",
};

const pin = sharedGlobePinFromMessageRow(row);
assert.ok(pin);
assert.equal(pin?.payload.placeLabel, "제주");

const humanRow: PeerMessageRow = {
  ...row,
  id: "msg-2",
  message_type: "human",
  ai_payload: null,
};
assert.equal(sharedGlobePinFromMessageRow(humanRow), null);

const pins = listSharedGlobePinsFromMessages([humanRow, row]);
assert.equal(pins.length, 1);

const classified = projectSharedGlobeClassifiedPins(pins);
assert.equal(classified.length, 1);
assert.equal(classified[0]?.authorDisplayName, "민수");
assert.equal(classified[0]?.peerThreadId, "peer-group-abc");

const emptyGlobe = globeViewForSharedPins([]);
assert.equal(emptyGlobe.placeLabel, "우리 지구");
assert.ok(emptyGlobe.zoom < 1.2);

const focusedGlobe = globeViewForSharedPins(classified);
assert.equal(focusedGlobe.lat, 33.389);

assert.throws(() => validateGlobePinCoords(120, 0), /invalid_lat/);
assert.throws(() => validateGlobePinCoords(0, 400), /invalid_lng/);

const map = projectLatLngToMapPercent(33.389, 126.553);
const roundTrip = mapPercentToLatLng(map.x, map.y);
assert.ok(Math.abs(roundTrip.lat - 33.389) < 0.02);
assert.ok(Math.abs(roundTrip.lng - 126.553) < 0.02);

assert.match(
  buildGlobePinSystemBody({
    senderDisplayName: "민수",
    placeLabel: "제주",
    hasPhoto: true,
  }),
  /사진 핀/,
);

const photoPayload = {
  ...payload,
  imageUrl: "https://example.com/photo.jpg",
  mediaKind: "photo" as const,
};
const photoPins = projectSharedGlobeClassifiedPins([
  {
    messageId: "msg-photo",
    peerThreadId: "peer-group-abc",
    senderUserId: "user-a",
    sentAt: "2026-06-06T10:00:00.000Z",
    payload: photoPayload,
  },
]);
assert.equal(photoPins[0]?.kind, "photo");

console.log("test-peer-globe-pins: ok");
