#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { groupFeedSlotsByWindow } from "../lib/feed/group-feed-slots-by-window";
import type { FeedTodaySlot } from "../lib/feed/feed-today-slot-types";

const now = new Date("2026-06-03T10:00:00+09:00");

function calendarSlot(id: string, startMs: number, dateKey: string): FeedTodaySlot {
  const date = new Date(startMs);
  return {
    kind: "calendar",
    id: `calendar:${id}`,
    slotType: "schedule",
    row: {
      id,
      event: {
        id: `chip:${id}`,
        layer: "action",
        eventId: null,
        entry: null,
        title: id,
        dateKey,
        startMs,
        hour: date.getHours(),
        minute: date.getMinutes(),
        tone: "green",
        hasTime: true,
      },
      overlayActions: [],
    },
  };
}

const todayMs = new Date("2026-06-03T14:00:00+09:00").getTime();
const tomorrowMs = new Date("2026-06-04T10:00:00+09:00").getTime();

const groups = groupFeedSlotsByWindow(
  [
    calendarSlot("a", todayMs, "2026-06-03"),
    calendarSlot("b", tomorrowMs, "2026-06-04"),
  ],
  { today: "오늘", tomorrow: "내일", later: "이후", unset: "예정" },
  now,
);

assert.equal(groups.length, 2);
assert.equal(groups[0]?.id, "today");
assert.equal(groups[1]?.id, "tomorrow");
assert.equal(groups[0]?.slots.length, 1);

console.log("test-feed-slot-groups: ok");
