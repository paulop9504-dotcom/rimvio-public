import assert from "node:assert/strict";
import { emptyPinnedRoster, connectPeerToHub } from "../lib/context/pinned-peer-roster";
import type { PeerContact } from "../lib/context/peer-contact-types";
import { buildPeersHomeRows } from "../lib/social/build-peers-home-rows";
import type { SocialBubblePeer } from "../lib/social/bubble-state";

const contact: PeerContact = {
  peerThreadId: "thread-local-1",
  displayName: "민수",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

let roster = emptyPinnedRoster();
const pinned = connectPeerToHub({
  roster,
  peerThreadId: "thread-pinned-1",
  displayName: "지연",
  preferredSlotIndex: 0,
});
roster = pinned.roster;

const socialPinned: SocialBubblePeer = {
  friendId: "u1",
  threadId: "thread-pinned-1",
  displayName: "지연",
  rimvioId: "jiyeon",
  avatarUrl: null,
  bubbleState: "idle",
  isPinned: true,
  pinSlot: 0,
  unreadCount: 2,
  lastInteractionAt: "2026-06-10T00:00:00.000Z",
  messagesPurgeAfter: null,
};

const rows = buildPeersHomeRows({
  pinned: [socialPinned],
  archive: [],
  contacts: [contact],
  roster,
  feedSlots: [],
});

assert.equal(rows.length, 2);
assert.ok(rows.some((row) => row.threadId === "thread-local-1"));
assert.ok(rows.some((row) => row.threadId === "thread-pinned-1" && row.isPinned));

console.log("--- peers home rows ---");
console.log("ok");
