#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";
import type { FeedSlotPeerLookup } from "../lib/feed/feed-slot-peer-context-types";
import {
  resolveFeedSlotPeerContext,
  resolveFeedSlotPeerContexts,
} from "../lib/feed/resolve-feed-slot-peer-context";
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
    {
      id: "msg-schedule",
      feedPeerTalkThread: null,
    },
  ],
  peers: [
    {
      peerThreadId: "peer-dm-a__b",
      displayName: "수연",
      avatarUrl: "https://cdn.example/avatar.png",
      rimvioId: "suyeon",
      emailLower: "suyeon@example.com",
    },
    {
      peerThreadId: "peer-dm-c__d",
      displayName: "민수",
      avatarUrl: null,
      rimvioId: "minsu",
      emailLower: null,
    },
  ],
};

function calendarSlot(messageId: string | null): FeedTodaySlot {
  const row: UnifiedCalendarOverlayRow = {
    id: "cal-1",
    event: {
      id: "chip-1",
      layer: "action",
      eventId: null,
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

const fromTalk = resolveFeedSlotPeerContext(calendarSlot("msg-schedule"), lookup);
assert.equal(fromTalk?.displayName, "수연");
assert.equal(fromTalk?.peerThreadId, "peer-dm-a__b");
assert.equal(fromTalk?.source, "feed_talk");

const multiNameSlot = calendarSlot(null);
assert.equal(multiNameSlot.kind, "calendar");
const fromNames = resolveFeedSlotPeerContexts(
  {
    ...multiNameSlot,
    row: {
      ...multiNameSlot.row,
      prompt_hint: "수연이랑 민수와 스타벅스에서 만나기",
    },
  },
  lookup,
);
assert.equal(fromNames.length, 2);
assert.equal(fromNames[0]?.displayName, "수연");
assert.equal(fromNames[1]?.displayName, "민수");
assert.equal(fromNames[0]?.emailLower, "suyeon@example.com");

const unknown = resolveFeedSlotPeerContext(calendarSlot(null), { messages: [], peers: [] });
assert.equal(unknown, null);

const fromPlan = resolveFeedSlotPeerContexts(calendarSlot(null), lookup, {
  planId: "jeju",
  title: "제주 여행",
  windowStartIso: "2026-06-10T15:00:00+09:00",
  windowEndIso: "2026-06-12T19:00:00+09:00",
  windowConfidence: "confirmed",
  nights: 2,
  place: "제주",
  peerDisplayName: "민수",
  peerThreadId: "peer-dm-c__d",
  attachMode: "new",
  planMode: "group",
});
assert.equal(fromPlan.length, 1);
assert.equal(fromPlan[0]?.displayName, "민수");
assert.equal(fromPlan[0]?.source, "plan_metadata");

console.log("test-feed-slot-peer-context: ok");
