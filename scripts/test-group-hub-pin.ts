#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  connectPeerToHub,
  countConnectedPeers,
  emptyPinnedRoster,
  findSlotByPeerId,
} from "../lib/context/pinned-peer-roster";
import { resolveHubRoomKind } from "../lib/peer-chat/resolve-hub-room-kind";

const groupId = "peer-group-11111111-1111-1111-1111-111111111111";
const dmId = "peer-dm-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa__bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

assert.equal(resolveHubRoomKind(groupId), "group");
assert.equal(resolveHubRoomKind(dmId), "dm");

let roster = emptyPinnedRoster();
const dmPin = connectPeerToHub({
  roster,
  peerThreadId: dmId,
  displayName: "민수",
  preferredSlotIndex: 0,
});
assert.equal(dmPin.ok, true);
roster = dmPin.ok ? dmPin.roster : roster;

const groupPin = connectPeerToHub({
  roster,
  peerThreadId: groupId,
  displayName: "주말 모임",
  preferredSlotIndex: 1,
});
assert.equal(groupPin.ok, true);
if (groupPin.ok) {
  roster = groupPin.roster;
  const slot = findSlotByPeerId(roster, groupId);
  assert.equal(slot?.roomKind, "group");
  assert.equal(slot?.slotIndex, 1);
}

assert.equal(countConnectedPeers(roster), 2);

for (const [id, name] of [
  ["peer-group-22222222-2222-2222-2222-222222222222", "셋"],
  ["peer-group-33333333-3333-3333-3333-333333333333", "넷"],
  ["peer-group-44444444-4444-4444-4444-444444444444", "다섯"],
] as const) {
  const next = connectPeerToHub({ roster, peerThreadId: id, displayName: name });
  assert.equal(next.ok, true);
  roster = next.ok ? next.roster : roster;
}
assert.equal(countConnectedPeers(roster), 5);

const overflow = connectPeerToHub({
  roster,
  peerThreadId: "peer-group-55555555-5555-5555-5555-555555555555",
  displayName: "여섯",
});
assert.equal(overflow.ok, false);
if (!overflow.ok) {
  assert.equal(overflow.reason, "no_vacant_slot");
}

console.log("test-group-hub-pin: ok");
