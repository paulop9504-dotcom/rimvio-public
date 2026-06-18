#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  isMessageReadByPeer,
  shouldShowPeerSentCheck,
} from "@/lib/peer-chat/peer-read-receipt";
import type { PeerMessage } from "@/lib/context/peer-message-types";

assert.equal(
  isMessageReadByPeer("2026-06-03T10:00:00.000Z", "2026-06-03T11:00:00.000Z"),
  true,
);
assert.equal(
  isMessageReadByPeer("2026-06-03T12:00:00.000Z", "2026-06-03T11:00:00.000Z"),
  false,
);
assert.equal(isMessageReadByPeer("2026-06-03T10:00:00.000Z", null), false);

const messages: PeerMessage[] = [
  {
    id: "m1",
    peerThreadId: "peer-dm-a__b",
    author: "me",
    body: "hi",
    sentAt: "2026-06-03T10:00:00.000Z",
    messageType: "human",
  },
];

assert.equal(shouldShowPeerSentCheck(messages, 0, null), true);
assert.equal(
  shouldShowPeerSentCheck(messages, 0, "2026-06-03T11:00:00.000Z"),
  false,
);

console.log("test-peer-read-receipt: ok");
