#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { composeUnifiedCalendarOverlay } from "../lib/calendar/compose-unified-calendar-overlay";
import type { CalendarEventChip } from "../lib/calendar/calendar-view-types";

const eventChips: CalendarEventChip[] = [
  {
    id: "event:ec-1",
    layer: "event",
    eventId: "ec-1",
    entry: null,
    title: "병원",
    dateKey: "2026-06-03",
    startMs: new Date("2026-06-03T14:00:00").getTime(),
    hour: 14,
    minute: 0,
    tone: "teal",
    hasTime: true,
  },
];

const actionChips: CalendarEventChip[] = [
  {
    id: "action:ec-1",
    layer: "action",
    eventId: "ec-1",
    entry: null,
    title: "병원",
    dateKey: "2026-06-03",
    startMs: new Date("2026-06-03T14:00:00").getTime(),
    hour: 14,
    minute: 0,
    tone: "blue",
    hasTime: true,
    projectedActions: [
      { id: "ec-1:T-2h:navigate", label: "길찾기", phase: "T-2h" },
      { id: "ec-1:T-2h:call", label: "전화", phase: "T-2h" },
    ],
  },
  {
    id: "action:orphan",
    layer: "action",
    eventId: null,
    entry: {
      id: "link:x",
      messageId: null,
      linkId: "link-1",
      reminderId: "r1",
      kind: "link_reminder",
      title: "길찾기",
      subtitle: "알림",
      fireAt: "2026-06-03T14:00:00",
      placeName: null,
      actionCount: 1,
      countdownLabel: "길찾기",
    },
    title: "길찾기",
    dateKey: "2026-06-03",
    startMs: new Date("2026-06-03T14:00:00").getTime(),
    hour: 14,
    minute: 0,
    tone: "blue",
    hasTime: true,
  },
];

const now = new Date("2026-06-03T11:00:00");
const rows = composeUnifiedCalendarOverlay(eventChips, actionChips, now);

assert.equal(rows.length, 1, "event row with attached overlays");
assert.equal(rows[0]!.overlayActions.length, 3);
assert.ok(rows[0]!.overlayActions.some((action) => action.label === "길찾기"));

const standaloneActionOnly = composeUnifiedCalendarOverlay([], actionChips, now);
assert.equal(
  standaloneActionOnly.length,
  2,
  "action-only entries become standalone calendar rows",
);

console.log("test-unified-calendar-overlay: ok");
