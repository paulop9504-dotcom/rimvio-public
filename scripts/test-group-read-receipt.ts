#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { PeerMessage } from "../lib/context/peer-message-types";
import {
  countGroupReadersForMessage,
  groupReadCountForMessage,
} from "../lib/peer-chat/group-read-receipt";

const sentAt = "2026-06-06T10:00:00.000Z";
const before = "2026-06-06T09:00:00.000Z";
const after = "2026-06-06T11:00:00.000Z";

const cursors = [
  { userId: "u1", lastReadAt: after },
  { userId: "u2", lastReadAt: before },
  { userId: "u3", lastReadAt: null },
];

assert.equal(countGroupReadersForMessage(sentAt, cursors), 1);

const messages: PeerMessage[] = [
  {
    id: "m1",
    peerThreadId: "peer-group-1",
    author: "me",
    body: "안녕",
    sentAt,
    messageType: "human",
    aiPayload: null,
    imageUrl: null,
    visibleToMeOnly: false,
  },
  {
    id: "m2",
    peerThreadId: "peer-group-1",
    author: "me",
    body: "또",
    sentAt: "2026-06-06T10:05:00.000Z",
    messageType: "human",
    aiPayload: null,
    imageUrl: null,
    visibleToMeOnly: false,
  },
];

assert.equal(groupReadCountForMessage(messages, 0, cursors), 1);
assert.equal(groupReadCountForMessage(messages, 1, cursors), 1);

const solo: PeerMessage[] = [messages[0]!];
assert.equal(groupReadCountForMessage(solo, 0, []), 0);

console.log("test-group-read-receipt: ok");
