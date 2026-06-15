#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { detectEventCandidate } from "../lib/events/event-candidate";
import { emitEventCandidate, applyEventCandidateUpsertFromApi } from "../lib/events/emit-event-candidate";
import {
  ingestConfirmationSignal,
  ingestScheduleSignal,
} from "../lib/events/event-ingest-pipeline";
import {
  listEventCandidatesByLifecycle,
  resetEventCandidatesForTests,
  transitionEventLifecycle,
} from "../lib/events/event-store";

const REF = "2026-05-31";
const MSG = "내일 치과 있는데";
const MSG_ID = "assistant-msg-001";

function seedMentioned() {
  resetEventCandidatesForTests();
  const draft = detectEventCandidate({ message: MSG, referenceDate: REF });
  const wire = emitEventCandidate(draft);
  return applyEventCandidateUpsertFromApi(wire, { sourceMessageId: MSG_ID })!;
}

const mentioned = seedMentioned();
assert.equal(mentioned.lifecycle, "mentioned");

const confirmed = ingestConfirmationSignal({
  sourceMessage: MSG,
  sourceMessageId: MSG_ID,
  place: "치과",
  title: "치과",
})!;
assert.equal(confirmed.lifecycle, "confirmed");
assert.equal(confirmed.id, mentioned.id);
assert.equal(confirmed.metadata?.sourceMessageId, MSG_ID);

const scheduled = ingestScheduleSignal({
  sourceMessage: MSG,
  sourceMessageId: MSG_ID,
  datetime: `${REF}T17:00:00`,
  place: "치과",
})!;
assert.equal(scheduled.lifecycle, "scheduled");
assert.equal(scheduled.datetime, `${REF}T17:00:00`);

transitionEventLifecycle(scheduled.id, "active");
assert.equal(listEventCandidatesByLifecycle("active").length, 1);

resetEventCandidatesForTests([]);
console.log("test-event-ingest-pipeline: ok");
