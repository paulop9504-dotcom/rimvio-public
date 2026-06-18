#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import type { UnifiedCalendarOverlayRow } from "../lib/calendar/calendar-view-types";
import type { EventCandidate } from "../lib/events/event-candidate";
import {
  derivePlanAwareSlotContext,
  derivePlanAwareSlotTimeLabel,
  indexEventsById,
  resolvePlanContextForCalendarRow,
} from "../lib/plan-context/project-plan-to-feed-slot";
import { listEventCalendarRows } from "../lib/events/project-event-calendar";
import { resetEventCandidatesForTests } from "../lib/events/event-store";

const planEvent: EventCandidate = {
  id: "plan-osaka",
  title: "오사카 여행",
  category: "travel",
  source: "peer_chat",
  lifecycle: "active",
  datetime: "2026-06-12T09:00:00+09:00",
  place: "오사카",
  metadata: {
    feedPlanEnabled: true,
    planKind: "plan",
    planWindowEndIso: "2026-06-15T18:00:00+09:00",
    planNights: 3,
    planWindowConfidence: "confirmed",
    planPeerDisplayName: "민수",
  },
};

const row: UnifiedCalendarOverlayRow = {
  id: "row:plan-osaka",
  event: {
    id: "chip:plan-osaka",
    layer: "event",
    eventId: "plan-osaka",
    entry: null,
    title: "오사카 여행",
    dateKey: "2026-06-12",
    startMs: Date.parse("2026-06-12T09:00:00+09:00"),
    hour: 9,
    minute: 0,
    tone: "blue",
    hasTime: true,
  },
  overlayActions: [],
};

const eventsById = indexEventsById([planEvent]);
const plan = resolvePlanContextForCalendarRow(row, eventsById);
assert.ok(plan);
assert.equal(plan!.windowEndIso, "2026-06-15T18:00:00+09:00");

const timeLabel = derivePlanAwareSlotTimeLabel(row, plan);
assert.match(timeLabel, /6월 12일/);
assert.match(timeLabel, /6월 15일/);
assert.match(timeLabel, /3박/);

const context = derivePlanAwareSlotContext(row, plan);
assert.match(context!, /오사카/);
assert.match(context!, /민수와 함께/);

resetEventCandidatesForTests([planEvent]);
const calendarRows = listEventCalendarRows();
assert.ok(
  calendarRows.some((entry) => entry.eventId === "plan-osaka"),
  "active feed plan should appear on event calendar",
);

resetEventCandidatesForTests([]);

console.log("test-plan-context-feed: ok");
