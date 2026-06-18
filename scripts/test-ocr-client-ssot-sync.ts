#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  applyOcrCalendarCommitToClient,
} from "../lib/event-kernel/review/sync-ocr-commit-to-client";
import {
  getReviewState,
  resetReviewStateForTests,
} from "../lib/event-kernel/review/review-state";
import {
  applyPendingEventCandidateDatePatches,
  resetPendingEventCandidatesForTests,
} from "../lib/event-kernel/review/pending-event-candidate-store";
import { orchestrateOcrScheduleCandidates } from "../lib/events/orchestrate-ocr-schedule-candidates";
import { orchestrateEventReviewApproval } from "../lib/events/orchestrate-event-review-approval";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { listEventCalendarRows } from "../lib/events/project-event-calendar";

const OCR_BLOCK = `[첨부1·사진] schedule.png
[첨부1·OCR본문]
7시 기상
11:30 점심
14시 병원
[첨부1·Vision] x`;

resetReviewStateForTests();
resetPendingEventCandidatesForTests();
resetEventCandidatesForTests();

orchestrateOcrScheduleCandidates({
  composerContext: OCR_BLOCK,
  referenceDate: "2026-06-01",
});

applyPendingEventCandidateDatePatches(
  getReviewState().candidateIds.map((candidateId) => ({
    candidateId,
    date: "2026-06-02",
  }))
);

const approval = orchestrateEventReviewApproval({ message: "응" });
assert.ok(approval?.eventCandidateUpserts?.length);
assert.equal(approval!.eventCandidateUpserts!.length, 3);

resetEventCandidatesForTests();
const synced = applyOcrCalendarCommitToClient({
  eventCandidateUpserts: approval!.eventCandidateUpserts!,
  calendarEvents: approval!.metadata?.calendar_events as never,
});
assert.equal(synced.syncedEvents, 3);
assert.ok(listEventCalendarRows().length >= 3);

console.log("test-ocr-client-ssot-sync: ok");
