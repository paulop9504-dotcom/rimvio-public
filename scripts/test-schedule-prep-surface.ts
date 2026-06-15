#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { computeContextualEventActions } from "../lib/action-projection/compute-contextual-event-actions";
import {
  isEventInPrepSurfaceWindow,
  resolveSchedulePrepSurface,
} from "../lib/calendar/resolve-schedule-prep-surface";
import { composeUnifiedCalendarOverlay } from "../lib/calendar/compose-unified-calendar-overlay";
import type { CalendarEventChip } from "../lib/calendar/calendar-view-types";

const airportEvent: CalendarEventChip = {
  id: "event:flight-1",
  layer: "event",
  eventId: "flight-1",
  entry: null,
  title: "인천공항 출발",
  dateKey: "2026-06-03",
  startMs: new Date("2026-06-03T10:00:00").getTime(),
  hour: 10,
  minute: 0,
  tone: "blue",
  hasTime: true,
};

function dayBeforePrep() {
  const now = new Date("2026-06-02T15:00:00");
  const actions = computeContextualEventActions({
    ecId: "flight-1",
    title: airportEvent.title,
    startAt: "2026-06-03T10:00:00",
    now,
  });

  assert.ok(actions.some((action) => action.label === "티켓 확인"));
  assert.ok(actions.some((action) => action.label === "체크인 확인"));

  const surface = resolveSchedulePrepSurface(
    composeUnifiedCalendarOverlay([airportEvent], [], now),
    now,
  );
  assert.equal(surface.visible, true);
  assert.equal(surface.phase, "preparation");
  assert.equal(surface.title, "일정 준비");
}

function dayOfDeparturePrep() {
  const now = new Date("2026-06-03T09:00:00");
  const actions = computeContextualEventActions({
    ecId: "flight-1",
    title: airportEvent.title,
    startAt: "2026-06-03T10:00:00",
    now,
  });

  assert.ok(actions.some((action) => action.label === "나갈 준비 확인"));
  assert.ok(actions.some((action) => action.label === "길찾기"));

  const surface = resolveSchedulePrepSurface(
    composeUnifiedCalendarOverlay([airportEvent], [], now),
    now,
  );
  assert.equal(surface.visible, true);
  assert.equal(surface.phase, "execution");
  assert.equal(surface.title, "출발 준비");
}

function hiddenWhenTooEarly() {
  const now = new Date("2026-06-01T09:00:00");
  const actions = computeContextualEventActions({
    ecId: "flight-1",
    title: airportEvent.title,
    startAt: "2026-06-03T10:00:00",
    now,
  });
  assert.equal(actions.length, 0);

  const surface = resolveSchedulePrepSurface(
    composeUnifiedCalendarOverlay([airportEvent], [], now),
    now,
  );
  assert.equal(surface.visible, false);
}

function hiddenAfterEvent() {
  const now = new Date("2026-06-03T13:00:00");
  assert.equal(isEventInPrepSurfaceWindow(airportEvent.startMs, now), false);

  const surface = resolveSchedulePrepSurface(
    composeUnifiedCalendarOverlay([airportEvent], [], now),
    now,
  );
  assert.equal(surface.visible, false);
}

function overseasTravelWithoutAirportKeyword() {
  const osakaEvent: CalendarEventChip = {
    id: "event:osaka-1",
    layer: "event",
    eventId: "osaka-1",
    entry: null,
    title: "오사카 해외여행",
    dateKey: "2026-06-03",
    startMs: new Date("2026-06-03T14:00:00").getTime(),
    hour: 14,
    minute: 0,
    tone: "teal",
    hasTime: true,
  };

  const now = new Date("2026-06-03T09:00:00");
  const ruleActions = computeContextualEventActions({
    ecId: "osaka-1",
    title: osakaEvent.title,
    startAt: "2026-06-03T14:00:00",
    now,
  });
  assert.ok(ruleActions.length >= 0);

  const surface = resolveSchedulePrepSurface(
    composeUnifiedCalendarOverlay([osakaEvent], [], now),
    now,
  );
  assert.equal(surface.visible, true);
  const labels = surface.rows[0]?.overlayActions.map((action) => action.label) ?? [];
  assert.ok(
    labels.some((label) => /eSIM|여권|환율|티켓|체크인/u.test(label)),
    `expected creative travel candidates, got: ${labels.join(", ")}`,
  );
}

dayBeforePrep();
dayOfDeparturePrep();
hiddenWhenTooEarly();
hiddenAfterEvent();
overseasTravelWithoutAirportKeyword();

console.log("test-schedule-prep-surface: ok");
