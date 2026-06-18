import assert from "node:assert/strict";
import type { PeerMessage } from "../lib/context/peer-message-types";
import { shouldShowPeerMessageTime } from "../lib/peer-chat/message-time-visibility";

const base = (i: number, author: "me" | "peer", offsetSec: number): PeerMessage => ({
  id: `m${i}`,
  peerThreadId: "t",
  author,
  body: "hi",
  sentAt: new Date(2026, 0, 1, 12, 0, offsetSec).toISOString(),
  messageType: "human",
});

const burst = [base(0, "me", 0), base(1, "me", 15), base(2, "me", 45)];
assert.equal(shouldShowPeerMessageTime(burst, 0), false);
assert.equal(shouldShowPeerMessageTime(burst, 1), false);
assert.equal(shouldShowPeerMessageTime(burst, 2), true);

const gap = [base(0, "peer", 0), base(1, "peer", 90)];
assert.equal(shouldShowPeerMessageTime(gap, 0), true);
assert.equal(shouldShowPeerMessageTime(gap, 1), true);

console.log("test-message-time-visibility: ok");
