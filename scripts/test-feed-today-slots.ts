#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildFeedTodaySlots, deriveCalendarSlotHeadline } from "../lib/feed/build-feed-today-slots";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";

const now = new Date("2026-06-03T10:00:00+09:00");

function calendarRow(
  id: string,
  title: string,
  startMs: number,
  dateKey: string,
): UnifiedCalendarOverlayRow {
  const date = new Date(startMs);
  return {
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
        countdownLabel: "길찾기",
      },
      title,
      dateKey,
      startMs,
      hour: date.getHours(),
      minute: date.getMinutes(),
      tone: "green",
      hasTime: true,
    },
    overlayActions: [
      { id: `${id}:nav`, label: "길찾기", source: "stream" },
      { id: `${id}:call`, label: "연락하기", source: "stream" },
      { id: `${id}:later`, label: "나중에", source: "stream" },
    ],
    prompt_hint: `내일 ${date.getHours()}시 스타벅스에서 만나 약속`,
  };
}

const tomorrowMs = new Date("2026-06-04T13:00:00+09:00").getTime();
const rows = [
  calendarRow("a", "스타벅스 약속", tomorrowMs, "2026-06-04"),
  calendarRow("b", "점심 미팅", tomorrowMs + 3_600_000, "2026-06-04"),
  calendarRow("c", "저녁 식사", tomorrowMs + 7_200_000, "2026-06-04"),
];

const { today } = buildFeedTodaySlots({
  primary: null,
  latent: [],
  overlayRows: rows,
  now,
});

assert.equal(today.length, 3, "calendar overlay rows should become feed slots");
assert.equal(today[0]?.kind, "calendar");
assert.ok(today.every((slot) => slot.kind === "calendar"));

const headline = deriveCalendarSlotHeadline(rows[0]!, now);
assert.match(headline, /스타벅스/);

console.log("test-feed-today-slots: ok");
