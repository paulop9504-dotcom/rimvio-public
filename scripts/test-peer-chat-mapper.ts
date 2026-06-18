import assert from "node:assert/strict";
import {
  mapPeerMessageRow,
  mergePeerMessages,
  mergePeerMessagesBatch,
  sortPeerMessages,
} from "../lib/peer-chat/message-mapper";

const row = {
  id: "m1",
  thread_id: "peer-a",
  sender_user_id: "user-a",
  body: "hello",
  message_type: "human" as const,
  ai_payload: null,
  created_at: "2026-01-02T00:00:00.000Z",
};

assert.equal(mapPeerMessageRow(row, "user-a").author, "me");
assert.equal(mapPeerMessageRow(row, "user-b").author, "peer");

const sorted = sortPeerMessages([
  {
    id: "2",
    peerThreadId: "peer-a",
    author: "peer",
    body: "b",
    sentAt: "2026-01-02T00:00:02.000Z",
    messageType: "human",
  },
  {
    id: "1",
    peerThreadId: "peer-a",
    author: "me",
    body: "a",
    sentAt: "2026-01-02T00:00:01.000Z",
    messageType: "human",
  },
]);
assert.equal(sorted[0]?.id, "1");

const merged = mergePeerMessages(sorted, {
  id: "1",
  peerThreadId: "peer-a",
  author: "me",
  body: "a",
  sentAt: "2026-01-02T00:00:01.000Z",
  messageType: "human",
});
assert.equal(merged.length, 2);

const batched = mergePeerMessagesBatch(sorted, [
  {
    id: "3",
    peerThreadId: "peer-a",
    author: "me",
    body: "c",
    sentAt: "2026-01-02T00:00:03.000Z",
    messageType: "human",
  },
]);
assert.equal(batched.length, 3);
assert.equal(batched[2]?.id, "3");

console.log("test-peer-chat-mapper: ok");
