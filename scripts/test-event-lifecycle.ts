#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { detectEventCandidate } from "../lib/events/event-candidate";
import { emitEventCandidate, applyEventCandidateUpsertFromApi } from "../lib/events/emit-event-candidate";
import {
  ingestConfirmationSignal,
  ingestScheduleSignal,
} from "../lib/events/event-ingest-pipeline";
import {
  transitionEventLifecycle,
  listEventCandidatesByLifecycle,
  resetEventCandidatesForTests,
} from "../lib/events/event-store";
import { wireEventCompleted } from "../lib/events/event-lifecycle-hooks";
import { syncEventLifecycle } from "../lib/events/event-lifecycle-runner";
import { ARCHIVE_WINDOW_MS, ACTIVE_WINDOW_MS } from "../lib/events/event-lifecycle";

const REF = "2026-05-31";
const MSG = "내일 치과 있는데";
const DATETIME = "2026-06-01T17:00:00";

function seedMentioned() {
  resetEventCandidatesForTests();
  const draft = detectEventCandidate({ message: MSG, referenceDate: REF });
  const wire = emitEventCandidate(draft);
  return applyEventCandidateUpsertFromApi(wire)!;
}

function testMentionedToConfirmed() {
  const event = seedMentioned();
  assert.equal(event.lifecycle, "mentioned");

  const confirmed = ingestConfirmationSignal({ sourceMessage: MSG });
  assert.ok(confirmed);
  assert.equal(confirmed!.lifecycle, "confirmed");
  assert.equal(listEventCandidatesByLifecycle("confirmed").length, 1);
}

function testConfirmedToScheduled() {
  seedMentioned();
  ingestConfirmationSignal({ sourceMessage: MSG });
  const scheduled = ingestScheduleSignal({ sourceMessage: MSG, datetime: DATETIME });
  assert.ok(scheduled);
  assert.equal(scheduled!.lifecycle, "scheduled");
}

function testScheduledToActive() {
  const now = new Date("2026-06-01T16:30:00");
  seedMentioned();
  ingestConfirmationSignal({ sourceMessage: MSG });
  ingestScheduleSignal({ sourceMessage: MSG, datetime: DATETIME });

  syncEventLifecycle({ now, activeWindowMs: ACTIVE_WINDOW_MS });
  const active = listEventCandidatesByLifecycle("active");
  assert.equal(active.length, 1);
  assert.equal(active[0]?.title, "치과");
}

function testActiveToCompleted() {
  seedMentioned();
  ingestConfirmationSignal({ sourceMessage: MSG });
  ingestScheduleSignal({ sourceMessage: MSG, datetime: DATETIME });
  const event = listEventCandidatesByLifecycle("scheduled")[0]!;
  transitionEventLifecycle(event.id, "active");

  const completed = wireEventCompleted({ eventId: event.id, actionType: "NAVIGATE" });
  assert.ok(completed);
  assert.equal(completed!.lifecycle, "completed");
}

function testCompletedToArchived() {
  seedMentioned();
  ingestConfirmationSignal({ sourceMessage: MSG });
  ingestScheduleSignal({ sourceMessage: MSG, datetime: DATETIME });
  const event = listEventCandidatesByLifecycle("scheduled")[0]!;
  transitionEventLifecycle(event.id, "active");
  wireEventCompleted({ eventId: event.id, actionType: "NAVIGATE" });

  const archiveAt = new Date(Date.now() + ARCHIVE_WINDOW_MS + 1_000);
  syncEventLifecycle({ now: archiveAt, archiveWindowMs: ARCHIVE_WINDOW_MS });
  assert.equal(listEventCandidatesByLifecycle("archived").length, 1);
}

function testNoDowngradeOnUpsert() {
  seedMentioned();
  ingestConfirmationSignal({ sourceMessage: MSG });
  const draft = detectEventCandidate({ message: MSG, referenceDate: REF });
  const wire = emitEventCandidate(draft);
  const upserted = applyEventCandidateUpsertFromApi(wire);
  assert.equal(upserted?.lifecycle, "confirmed");
}

function main() {
  testMentionedToConfirmed();
  testConfirmedToScheduled();
  testScheduledToActive();
  testActiveToCompleted();
  testCompletedToArchived();
  testNoDowngradeOnUpsert();
  console.log("test-event-lifecycle: ok");
}

main();
