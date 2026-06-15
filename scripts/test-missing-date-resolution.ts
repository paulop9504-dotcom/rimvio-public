#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { OCR_REVIEW_DATES_PREFIX } from "../lib/event-kernel/review/pending-event-candidate-dates";
import {
  applyPendingEventCandidateDatePatches,
  resetPendingEventCandidatesForTests,
} from "../lib/event-kernel/review/pending-event-candidate-store";
import { executeApprovePendingEvents } from "../lib/event-kernel/review/execute-approve-pending-events";
import { loadPendingEventCandidates } from "../lib/event-kernel/review/pending-event-candidate-store";
import { validatePendingEventCandidates } from "../lib/event-kernel/review/validate-pending-event-candidate";
import { getReviewState, resetReviewStateForTests } from "../lib/event-kernel/review/review-state";
import { extractEventsFromOcr } from "../lib/events/extract-events-from-ocr";
import { orchestrateOcrScheduleCandidates } from "../lib/events/orchestrate-ocr-schedule-candidates";
import { orchestrateEventReviewApproval } from "../lib/events/orchestrate-event-review-approval";
import { orchestrateEventReviewDateResolution } from "../lib/events/orchestrate-event-review-date-resolution";
import { resetEventCandidatesForTests } from "../lib/events/event-store";
import { resetLinkRemindersForTests } from "../lib/local-links/reminders";

const OCR_BLOCK = `[첨부1·사진] schedule.png
[첨부1·OCR본문]
7시 기상
11:30 점심
14시 병원
[첨부1·Vision] x`;

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

resetReviewStateForTests();
resetPendingEventCandidatesForTests();
resetLinkRemindersForTests();
resetEventCandidatesForTests();

const scheduleOnly = extractEventsFromOcr("14시 병원", { referenceDate: "2026-06-01" });
if (scheduleOnly.events.length !== 1) {
  fail("single_line_extract_count");
}
const hospital = scheduleOnly.events[0]!;
if (hospital.date !== null) {
  fail("must_not_infer_screen_date");
}
if (!hospital.time) {
  fail("time_should_be_extracted");
}

orchestrateOcrScheduleCandidates({
  composerContext: OCR_BLOCK,
  referenceDate: "2026-06-01",
});

const blockedApprove = orchestrateEventReviewApproval({ message: "맞아" });
if (blockedApprove?.meta?.execution_route !== "EVENT_REVIEW_DATE_PICKER") {
  fail(`expected_date_picker_route got ${String(blockedApprove?.meta?.execution_route)}`);
}
if (!blockedApprove?.summary.includes("날짜")) {
  fail("blocked_summary_should_ask_for_date");
}
if (getReviewState().type !== "PENDING_EVENT_REVIEW") {
  fail("review_stays_pending_until_commit");
}

const directBlocked = executeApprovePendingEvents({
  candidateIds: getReviewState().candidateIds,
});
if (directBlocked.ok || directBlocked.error !== "validation_blocked") {
  fail("executeApprove_must_block_without_dates");
}

const review = getReviewState();
const patches = review.candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));
applyPendingEventCandidateDatePatches(patches);
const readyAfterPatch = validatePendingEventCandidates(
  loadPendingEventCandidates(review.candidateIds)
);
if (readyAfterPatch.some((row) => row.blockedBy.length > 0)) {
  fail("patch_should_clear_missing_date");
}

const resolved = orchestrateEventReviewDateResolution({
  message: `${OCR_REVIEW_DATES_PREFIX}${JSON.stringify({
    patches: review.candidateIds.map((candidateId) => ({
      candidateId,
      date: "2026-06-04",
    })),
  })}`,
});
if (resolved?.meta?.execution_route !== "EVENT_REVIEW_DATE_CONFIRM") {
  fail("date_resolution_confirm_route");
}
if (!resolved?.summary.includes("추가할까요")) {
  fail("confirm_summary_after_dates");
}

const commit = orchestrateEventReviewApproval({ message: "응" });
if (commit?.meta?.execution_route !== "CALENDAR_COMMIT") {
  fail(`post_date_commit_route got ${String(commit?.meta?.execution_route)}`);
}
if (!commit?.summary.includes("저장되었어요")) {
  fail("success_copy_only_after_commit");
}

console.log(
  JSON.stringify(
    {
      status: violations.length === 0 ? "PASS" : "FAIL",
      violations,
    },
    null,
    2
  )
);

if (violations.length > 0) {
  process.exit(1);
}

console.log("test-missing-date-resolution: ok");
