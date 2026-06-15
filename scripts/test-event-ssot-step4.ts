#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { detectEventCandidate } from "../lib/events/event-candidate";
import { emitEventCandidate, applyEventCandidateUpsertFromApi } from "../lib/events/emit-event-candidate";
import {
  ingestConfirmationSignal,
  ingestScheduleSignal,
  ingestCompletionSignal,
} from "../lib/events/event-ingest-pipeline";
import { wireEventCompleted } from "../lib/events/event-lifecycle-hooks";
import {
  listEventCandidatesByLifecycle,
  resetEventCandidatesForTests,
  transitionEventLifecycle,
} from "../lib/events/event-store";

const REF = "2026-06-15";
const MSG = "내일 치과 있는데";
const EC = "ec-step4-test";

function seedMentioned() {
  resetEventCandidatesForTests();
  const draft = detectEventCandidate({ message: MSG, referenceDate: REF });
  const wire = emitEventCandidate(draft);
  return applyEventCandidateUpsertFromApi(wire)!;
}

// 1. ec-id missing → NO completion
resetEventCandidatesForTests([
  {
    id: EC,
    title: "치과",
    category: "schedule",
    source: "message",
    lifecycle: "active",
    datetime: `${REF}T17:00:00`,
    confidence: 0.9,
    metadata: { sourceMessage: MSG },
    lifecycleUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]);
assert.equal(wireEventCompleted({ actionType: "NAVIGATE" }), null);
assert.equal(ingestCompletionSignal({ actionType: "CALL" }), null);
assert.equal(listEventCandidatesByLifecycle("active").length, 1);

// 2. ec-id present → completion only
const completed = wireEventCompleted({
  eventId: EC,
  actionType: "NAVIGATE",
});
assert.ok(completed);
assert.equal(completed!.lifecycle, "completed");

// 3. no findLatestOpenEvent fallback on confirm without match
resetEventCandidatesForTests([]);
const orphanConfirm = ingestConfirmationSignal({
  sourceMessage: "unknown message with no store entry",
  title: "고아",
});
assert.ok(orphanConfirm);
assert.equal(orphanConfirm!.lifecycle, "confirmed");

resetEventCandidatesForTests([]);
const mentioned = seedMentioned();
const confirmed = ingestConfirmationSignal({ sourceMessage: MSG, title: "치과" })!;
assert.equal(confirmed.id, mentioned.id);

const scheduled = ingestScheduleSignal({
  sourceMessage: MSG,
  datetime: `${REF}T17:00:00`,
})!;
assert.equal(scheduled.lifecycle, "scheduled");

transitionEventLifecycle(scheduled.id, "active");
assert.equal(
  wireEventCompleted({ anchorId: `${scheduled.id}:nav`, actionType: "NAVIGATE" })?.lifecycle,
  "completed"
);

resetEventCandidatesForTests([]);
console.log("test-event-ssot-step4: ok");
