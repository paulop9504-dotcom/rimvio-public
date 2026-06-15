#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";
import { CHAT_SCHEDULED_SOURCE_REF } from "../lib/events/chat-scheduled-ingest";
import type { EventCandidate } from "../lib/events/event-candidate";
import type { FeedSlotPeerLookup } from "../lib/feed/feed-slot-peer-context-types";
import { resolveFeedSlotOpenTarget } from "../lib/feed/resolve-feed-slot-open-target";
import type { FeedTodaySlot } from "../lib/feed/feed-today-slot-types";

const lookup: FeedSlotPeerLookup = {
  messages: [
    {
      id: "msg-thread",
      feedPeerTalkThread: {
        peerThreadId: "peer-dm-a__b",
        displayName: "수연",
      },
    },
    { id: "msg-schedule", feedPeerTalkThread: null },
  ],
  peers: [
    {
      peerThreadId: "peer-dm-a__b",
      displayName: "수연",
    },
  ],
};

function calendarSlot(messageId: string | null, eventId: string | null): FeedTodaySlot {
  const row: UnifiedCalendarOverlayRow = {
    id: "cal-1",
    event: {
      id: "chip-1",
      layer: "action",
      eventId,
      entry: {
        id: "entry-1",
        messageId,
        linkId: null,
        reminderId: null,
        kind: "revealed_actions",
        title: "스타벅스 약속",
        subtitle: "저장된 일정",
        fireAt: "2026-06-04T13:00:00+09:00",
        placeName: "스타벅스",
        actionCount: 0,
        countdownLabel: null,
      },
      title: "스타벅스 약속",
      dateKey: "2026-06-04",
      startMs: Date.parse("2026-06-04T13:00:00+09:00"),
      hour: 13,
      minute: 0,
      tone: "green",
      hasTime: true,
    },
    overlayActions: [],
    prompt_hint: "내일 1시 스타벅스에서 만나 약속",
  };

  return {
    kind: "calendar",
    id: "calendar:cal-1",
    slotType: "food",
    row,
  };
}

const talkTarget = resolveFeedSlotOpenTarget(
  calendarSlot("msg-schedule", null),
  lookup,
);
assert.equal(talkTarget.kind, "peer_room");
if (talkTarget.kind === "peer_room") {
  assert.equal(talkTarget.peerThreadId, "peer-dm-a__b");
  assert.equal(talkTarget.displayName, "수연");
}

const groupId = "peer-group-11111111-1111-1111-1111-111111111111";
const eventsById = new Map<string, EventCandidate>([
  [
    "ec-chat-msg-schedule",
    {
      id: "ec-chat-msg-schedule",
      title: "단톡 약속",
      category: "schedule",
      source: "message",
      lifecycle: "scheduled",
      datetime: "2026-06-04T13:00:00+09:00",
      confidence: 0.86,
      metadata: {
        sourceRef: CHAT_SCHEDULED_SOURCE_REF,
        messageId: "msg-schedule",
        peerThreadId: groupId,
        peerDisplayName: "주말 모임",
      },
      lifecycleUpdatedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
]);

const groupTarget = resolveFeedSlotOpenTarget(
  calendarSlot("msg-schedule", "ec-chat-msg-schedule"),
  { messages: [], peers: [] },
  eventsById,
);
assert.equal(groupTarget.kind, "peer_room");
if (groupTarget.kind === "peer_room") {
  assert.equal(groupTarget.peerThreadId, groupId);
}

const feedMsgTarget = resolveFeedSlotOpenTarget(
  calendarSlot("msg-main", "ec-chat-msg-main"),
  {
    messages: [{ id: "msg-main", feedPeerTalkThread: null }],
    peers: [],
  },
  new Map([
    [
      "ec-chat-msg-main",
      {
        id: "ec-chat-msg-main",
        title: "일정",
        category: "schedule",
        source: "message",
        lifecycle: "scheduled",
        confidence: 0.86,
        metadata: {
          sourceRef: CHAT_SCHEDULED_SOURCE_REF,
          messageId: "msg-main",
        },
        lifecycleUpdatedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  ]),
);
assert.equal(feedMsgTarget.kind, "feed_message");
if (feedMsgTarget.kind === "feed_message") {
  assert.equal(feedMsgTarget.messageId, "msg-main");
}

const planGroupId = "peer-group-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const planFeedTarget = resolveFeedSlotOpenTarget(
  calendarSlot(null, "ec-plan-germany"),
  { messages: [], peers: [] },
  new Map([
    [
      "ec-plan-germany",
      {
        id: "ec-plan-germany",
        title: "독일 여행",
        category: "travel",
        source: "message",
        lifecycle: "active",
        datetime: "2026-07-01T09:00:00+09:00",
        place: "독일",
        confidence: 0.9,
        metadata: {
          feedPlanEnabled: true,
          planKind: "plan",
          planPeerThreadId: planGroupId,
          planPeerDisplayName: "A,B,C 단톡",
          planWindowEndIso: "2026-07-10T20:00:00+09:00",
          lensSource: "peer_chat",
        },
        lifecycleUpdatedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  ]),
);
assert.equal(planFeedTarget.kind, "peer_room");
if (planFeedTarget.kind === "peer_room") {
  assert.equal(planFeedTarget.peerThreadId, planGroupId);
  assert.equal(planFeedTarget.displayName, "A,B,C 단톡");
}

const calendarTarget = resolveFeedSlotOpenTarget(
  calendarSlot(null, null),
  { messages: [], peers: [] },
);
assert.equal(calendarTarget.kind, "calendar");

console.log("test-feed-slot-open-target: ok");
