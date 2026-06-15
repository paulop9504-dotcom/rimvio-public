#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  buildFireAtFromDateTime,
  demoteLinkFromActionStream,
} from "../lib/dual-mode/link-lifecycle";
import {
  eventIdForLinkReminder,
  isLinkReminderEvent,
  LINK_REMINDER_SOURCE_REF,
} from "../lib/events/link-reminder-ingest";
import {
  findEventCandidate,
  listEventCandidatesByLifecycle,
  resetEventCandidatesForTests,
} from "../lib/events/event-store";
import {
  readLinkReminderForLink,
  resetLinkRemindersForTests,
  scheduleLinkReminderAt,
} from "../lib/local-links/reminders";
import {
  readExistingSchedule,
  readExistingScheduleFromEventCandidates,
} from "../lib/schedule/day-schedule";

resetLinkRemindersForTests();
resetEventCandidatesForTests([]);

const fireAt = buildFireAtFromDateTime("2026-06-15", "15:00");
assert.equal(fireAt, "2026-06-15T15:00:00");

scheduleLinkReminderAt({
  linkId: "dual-link-1",
  title: "갤러리아 기사",
  url: "https://example.com/galleria",
  fireAt,
});

const eventId = eventIdForLinkReminder("dual-link-1");
const event = findEventCandidate(eventId);
assert.ok(event, "reminder write must ingest EventCandidate");
assert.equal(event!.lifecycle, "scheduled");
assert.equal(event!.metadata?.sourceRef, LINK_REMINDER_SOURCE_REF);
assert.ok(isLinkReminderEvent(event!));
assert.equal(event!.datetime, new Date(fireAt).toISOString());

assert.equal(listEventCandidatesByLifecycle("scheduled").length, 1);

const schedule = readExistingSchedule("2026-06-15");
assert.deepEqual(schedule, [{ time: "15:00", task: "갤러리아 기사" }]);

assert.equal(
  readExistingScheduleFromEventCandidates("2026-06-15").length,
  1,
);

assert.ok(readLinkReminderForLink("dual-link-1"));
demoteLinkFromActionStream("dual-link-1");
assert.equal(readLinkReminderForLink("dual-link-1"), null);
assert.equal(findEventCandidate(eventId)?.lifecycle, "archived");
assert.equal(readExistingSchedule("2026-06-15").length, 0);

console.log("test-reminder-event-ingest: ok");
