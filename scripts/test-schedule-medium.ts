#!/usr/bin/env npx tsx
/**
 * Schedule medium preference + execution helpers.
 * Usage: npm run test:schedule
 */

import assert from "node:assert/strict";
import { BLINK_ACTION_IDS } from "../lib/actions/blink-feature-actions";
import { isScheduleAction } from "../lib/actions/is-schedule-action";
import { buildGoogleCalendarTimedHref } from "../lib/actions/schedule-link-execution";
import {
  readScheduleMedium,
  writeScheduleMedium,
  SCHEDULE_MEDIUM_OPTIONS,
} from "../lib/preferences/schedule-medium";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

test("schedule medium options include three channels", () => {
  assert.equal(SCHEDULE_MEDIUM_OPTIONS.length, 3);
  assert.ok(SCHEDULE_MEDIUM_OPTIONS.some((item) => item.id === "rimvio"));
  assert.ok(SCHEDULE_MEDIUM_OPTIONS.some((item) => item.id === "google_calendar"));
  assert.ok(SCHEDULE_MEDIUM_OPTIONS.some((item) => item.id === "copy"));
});

test("writeScheduleMedium returns selected medium", () => {
  assert.equal(writeScheduleMedium("copy"), "copy");
  assert.equal(writeScheduleMedium("google_calendar"), "google_calendar");
  assert.equal(writeScheduleMedium("rimvio"), "rimvio");
  assert.equal(readScheduleMedium(), "rimvio");
});

test("isScheduleAction detects remind and todo actions", () => {
  assert.equal(
    isScheduleAction({
      id: "1",
      kind: "remind",
      label: "⏰ 나중에",
    }),
    true
  );

  assert.equal(
    isScheduleAction({
      id: "2",
      kind: "open",
      label: "열기",
      payload: { blinkAction: BLINK_ACTION_IDS.todoRegister },
    }),
    true
  );

  assert.equal(
    isScheduleAction({
      id: "3",
      kind: "open",
      label: "열기",
    }),
    false
  );
});

test("google calendar timed href includes dates param", () => {
  const start = new Date("2026-05-25T12:00:00.000Z");
  const href = buildGoogleCalendarTimedHref({
    title: "Test link",
    details: "https://example.com",
    start,
    durationMinutes: 30,
  });

  assert.match(href, /calendar\.google\.com/);
  assert.match(href, /action=TEMPLATE/);
  assert.match(href, /dates=/);
  assert.match(href, /text=Test/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
