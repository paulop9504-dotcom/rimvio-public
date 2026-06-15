#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  calendarEventChipClass,
  calendarScheduleOriginDetail,
  resolveCalendarScheduleOrigin,
} from "../lib/calendar/resolve-calendar-schedule-origin";
import { GOOGLE_CALENDAR_SOURCE_REF } from "../lib/events/google-calendar-ingest";
import { CHAT_SCHEDULED_SOURCE_REF } from "../lib/events/chat-scheduled-ingest";
import { projectEventCalendarChips } from "../lib/events/project-event-calendar";
import type { EventCalendarRow } from "../lib/events/project-event-calendar";

assert.equal(
  resolveCalendarScheduleOrigin({ sourceRef: GOOGLE_CALENDAR_SOURCE_REF }),
  "google_calendar",
);
assert.equal(
  resolveCalendarScheduleOrigin({ eventId: "ec-gcal-abc123" }),
  "google_calendar",
);
assert.equal(
  resolveCalendarScheduleOrigin({ sourceRef: CHAT_SCHEDULED_SOURCE_REF }),
  "rimvio",
);

const rows: EventCalendarRow[] = [
  {
    eventId: "ec-chat-1",
    title: "팀 미팅",
    startAt: "2026-06-10T14:00:00+09:00",
    startMs: Date.parse("2026-06-10T14:00:00+09:00"),
    category: "work",
    sourceRef: CHAT_SCHEDULED_SOURCE_REF,
  },
  {
    eventId: "ec-gcal-flight",
    title: "인천공항 출국",
    startAt: "2026-06-11T06:00:00+09:00",
    startMs: Date.parse("2026-06-11T06:00:00+09:00"),
    category: "travel",
    sourceRef: GOOGLE_CALENDAR_SOURCE_REF,
  },
];

const chips = projectEventCalendarChips(rows);
assert.equal(chips[0]?.scheduleOrigin, "rimvio");
assert.equal(chips[1]?.scheduleOrigin, "google_calendar");

assert.match(
  calendarEventChipClass({ tone: "teal", layer: "event", scheduleOrigin: "rimvio" }),
  /bg-\[#0D9488\]/,
);
assert.match(
  calendarEventChipClass({
    tone: "blue",
    layer: "event",
    scheduleOrigin: "google_calendar",
  }),
  /border/,
);

assert.match(calendarScheduleOriginDetail("rimvio"), /림비오/);
assert.match(calendarScheduleOriginDetail("google_calendar"), /Google Calendar/);

console.log("test-calendar-schedule-origin: ok");
