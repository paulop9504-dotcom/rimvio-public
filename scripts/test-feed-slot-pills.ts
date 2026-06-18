#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";
import {
  resolveFeedSlotNavigateQuery,
  resolveFeedSlotPills,
} from "../lib/feed/resolve-feed-slot-pills";
import type { FeedTodaySlot } from "../lib/feed/feed-today-slot-types";

function calendarSlot(
  id: string,
  title: string,
  context: string,
  startMs: number,
): FeedTodaySlot {
  const date = new Date(startMs);
  const row: UnifiedCalendarOverlayRow = {
    id,
    event: {
      id: `chip:${id}`,
      layer: "action",
      eventId: null,
      entry: {
        id: `entry:${id}`,
        messageId: null,
        linkId: null,
        reminderId: null,
        kind: "revealed_actions",
        title,
        subtitle: "저장된 일정",
        fireAt: date.toISOString(),
        placeName: null,
        actionCount: 0,
        countdownLabel: "내일 1시 스타벅스에서 만나 약속",
      },
      title,
      dateKey: "2026-06-04",
      startMs,
      hour: date.getHours(),
      minute: date.getMinutes(),
      tone: "green",
    },
    prompt_hint: context,
    context_lines: [context],
    slotType: "meal",
  };

  return {
    kind: "calendar",
    id: `calendar:${id}`,
    slotType: "meal",
    row,
  };
}

const slot = calendarSlot(
  "a1",
  "계산동 722에서의 약속",
  "내일 1시 스타벅스에서 만나 약속",
  Date.parse("2026-06-04T13:00:00+09:00"),
);

const query = resolveFeedSlotNavigateQuery(slot);
assert.equal(query, "스타벅스", `expected 스타벅스, got ${query}`);

const pills = resolveFeedSlotPills(slot);
assert.equal(pills.length, 2);
assert.equal(pills[0]?.label, "길찾기");
assert.equal(pills[1]?.label, "나중에");

const labels = pills.map((pill) => pill.label).join(",");
assert.doesNotMatch(labels, /연락하기/);
assert.doesNotMatch(labels, /스타벅스에서 만나/);

console.log("test-feed-slot-pills: ok");
