#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildActionCalendar } from "../lib/calendar/build-action-calendar";
import type { CalendarEventChip } from "../lib/calendar/calendar-view-types";

const studyAction: CalendarEventChip = {
  id: "study-1",
  layer: "action",
  eventId: null,
  entry: {
    id: "study-1",
    messageId: null,
    linkId: null,
    reminderId: null,
    kind: "study_focus",
    title: "공부 · 15:32 시작",
    subtitle: "15:32 시작",
    fireAt: new Date().toISOString(),
    placeName: null,
    actionCount: 0,
    countdownLabel: "2분 10초 경과",
  },
  title: "공부 · 15:32 시작",
  dateKey: "2026-06-02",
  startMs: Date.now(),
  hour: 15,
  minute: 32,
  tone: "blue",
  hasTime: true,
};

const snapshot = buildActionCalendar({
  eventChips: [],
  projectionActionChips: [],
  streamActions: [],
  knowledgeEntities: [],
  now: new Date(),
});

assert.equal(snapshot.rowCount, 0);

const withStudy = buildActionCalendar({
  eventChips: [],
  projectionActionChips: [],
  streamActions: [
    {
      id: "stream-study",
      messageId: null,
      linkId: null,
      reminderId: null,
      kind: "study_focus",
      title: "공부 · 15:32 시작",
      subtitle: "15:32 시작",
      fireAt: studyAction.entry!.fireAt,
      placeName: null,
      actionCount: 0,
      countdownLabel: "2분 10초 경과",
    },
  ],
});

assert.equal(withStudy.rowCount, 1, "standalone action must appear without events");
assert.equal(withStudy.overlayRows[0]!.event.title, "공부 · 15:32 시작");

console.log("test-action-calendar-overlay: ok");
