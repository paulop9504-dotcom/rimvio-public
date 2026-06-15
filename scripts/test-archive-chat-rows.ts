#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  buildArchiveChatRows,
  sortArchivePeersForChat,
} from "@/lib/social/archive-chat-rows";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";

function peer(
  threadId: string,
  unread: number,
  lastInteractionAt: string,
): SocialBubblePeer {
  return {
    friendId: `f-${threadId}`,
    threadId,
    displayName: threadId,
    rimvioId: null,
    avatarUrl: null,
    bubbleState: unread > 0 ? "active" : "idle",
    isPinned: false,
    pinSlot: null,
    unreadCount: unread,
    lastInteractionAt,
    messagesPurgeAfter: null,
  };
}

const sorted = sortArchivePeersForChat([
  peer("c", 0, "2026-06-01T10:00:00.000Z"),
  peer("a", 2, "2026-06-01T08:00:00.000Z"),
  peer("b", 0, "2026-06-03T10:00:00.000Z"),
]);

assert.deepEqual(
  sorted.map((row) => row.threadId),
  ["a", "b", "c"],
  "unread first, then recency",
);

const rows = buildArchiveChatRows(
  [peer("room-1", 1, "2026-06-01T10:00:00.000Z")],
  [
    {
      slotId: "slot-1",
      roomId: "room-1",
      friendId: "f-room-1",
      displayName: "민수",
      rimvioId: "minsu",
      avatarUrl: null,
      lastMessage: "안녕!",
      lastActivityAt: "2026-06-03T12:00:00.000Z",
      unreadCount: 1,
      isPinned: false,
    },
  ],
);

assert.equal(rows[0]?.lastMessage, "안녕!");
assert.equal(rows[0]?.lastActivityAt, "2026-06-03T12:00:00.000Z");

console.log("test-archive-chat-rows: ok");
