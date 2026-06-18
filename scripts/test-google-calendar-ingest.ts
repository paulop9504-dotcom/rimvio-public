#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  GOOGLE_CALENDAR_SOURCE_REF,
  eventIdForGoogleCalendar,
  googleCalendarEventToUpsert,
  googleCalendarEventToWire,
  ingestGoogleCalendarEvent,
  isGoogleCalendarEvent,
  parseGoogleCalendarStart,
} from "../lib/events/google-calendar-ingest";
import { categoryFromScheduleTitle } from "../lib/events/category-from-title";
import { replaceEventCandidatesForTests } from "../lib/events/event-store";

replaceEventCandidatesForTests([]);

assert.equal(categoryFromScheduleTitle("인천공항 탑승"), "travel");
assert.equal(categoryFromScheduleTitle("팀 미팅"), "work");

const gcalId = "abc123_event_id";
assert.equal(eventIdForGoogleCalendar(gcalId), "ec-gcal-abc123_event_id");

const travelEvent = {
  id: gcalId,
  summary: "인천공항 출국",
  location: "인천국제공항 T1",
  status: "confirmed",
  start: { dateTime: "2026-06-10T06:00:00+09:00" },
  htmlLink: "https://calendar.google.com/event?eid=abc",
};

assert.equal(
  parseGoogleCalendarStart(travelEvent),
  "2026-06-10T06:00:00+09:00",
);
assert.equal(
  parseGoogleCalendarStart({ start: { date: "2026-06-11" } }),
  "2026-06-11T09:00:00.000Z",
);

const upsert = googleCalendarEventToUpsert(travelEvent);
assert.ok(upsert);
assert.equal(upsert?.category, "travel");
assert.equal(upsert?.metadata?.sourceRef, GOOGLE_CALENDAR_SOURCE_REF);
assert.equal(upsert?.metadata?.gcalEventId, gcalId);

const wire = googleCalendarEventToWire(travelEvent);
assert.ok(wire);
assert.equal(wire?.id, eventIdForGoogleCalendar(gcalId));

const committed = ingestGoogleCalendarEvent(travelEvent);
assert.ok(committed);
assert.ok(isGoogleCalendarEvent(committed!));

assert.equal(googleCalendarEventToUpsert({ id: "x", summary: "", start: {} }), null);
assert.equal(
  googleCalendarEventToUpsert({
    id: "cancelled",
    summary: "취소됨",
    status: "cancelled",
    start: { dateTime: "2026-06-10T06:00:00+09:00" },
  }),
  null,
);

console.log("test-google-calendar-ingest: ok");
