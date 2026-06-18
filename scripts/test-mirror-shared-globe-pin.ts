import assert from "node:assert/strict";
import type { PeerGlobePinPayload } from "../lib/peer-chat/globe-pin-types";
import { mirrorSharedGlobePinToPersonalGlobe } from "../lib/peer-chat/mirror-shared-globe-pin-to-personal";
import { findPersonalGlobePinByEventId } from "../lib/globe/personal-globe-pin-store";
import { findLifeEventCandidate } from "../lib/life-read-model";
import { resolveEventGlobeCoords } from "../lib/globe/resolve-event-globe-coords";

const payload: PeerGlobePinPayload = {
  kind: "globe_pin",
  pinId: "test-pin-1",
  lat: 36.3,
  lng: 127.32,
  placeLabel: "세종 근처",
  senderDisplayName: "나",
  capturedAtIso: "2026-06-11T12:00:00.000Z",
};

const pin = mirrorSharedGlobePinToPersonalGlobe({
  payload,
  peerThreadId: "peer:test-thread",
  peerDisplayName: "황정성",
});

assert.equal(pin.lat, 36.3);
assert.equal(pin.lng, 127.32);
assert.ok(pin.acl.viewerPeerThreadIds?.includes("peer:test-thread"));

const event = findLifeEventCandidate(pin.eventId);
assert.ok(event);
assert.equal(event?.metadata?.planPeerThreadId, "peer:test-thread");
assert.equal(event?.metadata?.sharedGlobePinId, "test-pin-1");

const coords = resolveEventGlobeCoords(event!);
assert.equal(coords.lat, 36.3);
assert.equal(coords.lng, 127.32);

assert.ok(findPersonalGlobePinByEventId(pin.eventId));

console.log("test-mirror-shared-globe-pin: ok");
