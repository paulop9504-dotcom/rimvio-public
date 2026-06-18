#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getActionProjection, resetActionProjectionCacheForTests } from "../lib/action-projection/action-projection-cache";
import { composeActionProjection } from "../lib/action-projection/compose-action-projection";
import { computeContextualEventActions } from "../lib/action-projection/compute-contextual-event-actions";
import {
  listEventCalendarRows,
  projectEventCalendarChips,
} from "../lib/events/project-event-calendar";
import { upsertEventCandidate, resetEventCandidatesForTests } from "../lib/events/event-store";
import { invalidateActionProjection } from "../lib/action-projection/action-projection-cache";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

resetEventCandidatesForTests();
resetActionProjectionCacheForTests();

const future = new Date("2026-06-03T14:00:00");
const now24h = new Date(future.getTime() - 25 * 60 * 60 * 1000);
const actions24h = computeContextualEventActions({
  ecId: "ec-hospital",
  title: "병원",
  startAt: "2026-06-03T14:00:00",
  now: now24h,
});
if (!actions24h.some((row) => row.label === "준비물 확인")) {
  fail("T-24h_actions");
}

const now2h = new Date(future.getTime() - 2 * 60 * 60 * 1000);
const actions2h = computeContextualEventActions({
  ecId: "ec-hospital",
  title: "병원",
  startAt: "2026-06-03T14:00:00",
  now: now2h,
});
if (!actions2h.some((row) => row.label === "길찾기")) {
  fail("T-2h_actions");
}

upsertEventCandidate({
  title: "병원",
  category: "schedule",
  source: "system",
  lifecycle: "scheduled",
  datetime: "2026-06-03T14:00:00",
  confidence: 0.9,
});

const rows = listEventCalendarRows();
if (rows.length !== 1 || rows[0]!.eventId.length < 3) {
  fail("event_calendar_reads_ssot");
}

const eventChips = projectEventCalendarChips(rows);
if (eventChips[0]!.layer !== "event" || eventChips[0]!.entry !== null) {
  fail("event_calendar_passive_chips");
}

invalidateActionProjection();
const projection = composeActionProjection({ now: now2h });
if (projection.entries.length === 0) {
  fail("action_projection_from_timeline");
}

const composeSource = readFileSync(
  join(process.cwd(), "lib/action-projection/compose-action-projection.ts"),
  "utf8"
);
if (!composeSource.includes("projectTimelineDisplayFromRoutes")) {
  fail("action_projection_must_use_timeline_display_path");
}
if (composeSource.includes("listTimelineProjectionFromStore")) {
  fail("action_projection_must_not_use_timeline_list_api");
}

const cachedA = getActionProjection(now2h);
invalidateActionProjection();
upsertEventCandidate({
  title: "점심",
  category: "schedule",
  source: "system",
  lifecycle: "scheduled",
  datetime: "2026-06-03T12:00:00",
  confidence: 0.9,
});
const cachedB = getActionProjection(now2h);
if (cachedA.entries.length === cachedB.entries.length) {
  fail("projection_invalidates_on_ssot_write");
}

console.log(
  JSON.stringify(
    {
      status: violations.length === 0 ? "PASS" : "FAIL",
      violations,
      eventCalendarRows: rows.length,
      actionProjectionEntries: cachedB.entries.length,
    },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

assert.equal(violations.length, 0);
console.log("test-event-os-runtime-rules: ok");
