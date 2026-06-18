#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { collectActionStream } from "../lib/action-chat/active-actions-registry";
import { applyPendingEventCandidateDatePatches } from "../lib/event-kernel/review/pending-event-candidate-store";
import { executeApprovePendingEvents } from "../lib/event-kernel/review/execute-approve-pending-events";
import { getReviewState, resetReviewStateForTests } from "../lib/event-kernel/review/review-state";
import { resetPendingEventCandidatesForTests } from "../lib/event-kernel/review/pending-event-candidate-store";
import { orchestrateOcrScheduleCandidates } from "../lib/events/orchestrate-ocr-schedule-candidates";
import { orchestrateEventReviewApproval } from "../lib/events/orchestrate-event-review-approval";
import {
  readEventCandidatesRaw,
  resetEventCandidatesForTests,
  findEventCandidate,
} from "../lib/events/event-store";
import {
  readLinkReminders,
  resetLinkRemindersForTests,
} from "../lib/local-links/reminders";

const OCR_BLOCK = `[첨부1·사진] schedule.png
[첨부1·OCR본문]
7시 기상
9~11 보험 상담
11:30 점심
14시 병원
16시 고객 미팅
저녁에 운동
[첨부1·Vision] x`;

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

function setupOcrReview() {
  resetReviewStateForTests();
  resetPendingEventCandidatesForTests();
  resetLinkRemindersForTests();
  resetEventCandidatesForTests();
  return orchestrateOcrScheduleCandidates({
    composerContext: OCR_BLOCK,
    referenceDate: "2026-06-01",
  });
}

function verifyCommit(commit: ReturnType<typeof executeApprovePendingEvents>) {
  const scheduledInStore = readEventCandidatesRaw().filter(
    (item) => item.lifecycle === "scheduled"
  );
  const reminders = readLinkReminders().filter((item) =>
    item.linkId.startsWith("ocr-event-")
  );
  const actionStream = collectActionStream([], {});
  const linkReminderChips = actionStream.filter(
    (entry) => entry.kind === "link_reminder"
  );

  if (!commit.ok || commit.eventCandidateIds.length === 0) {
    fail("executeApprovePendingEvents_ok");
  }

  if (scheduledInStore.length < commit.eventCandidateIds.length) {
    fail("eventStoreUpdated");
  }

  for (const eventId of commit.eventCandidateIds) {
    const record = findEventCandidate(eventId);
    if (!record || record.lifecycle !== "scheduled") {
      fail(`ssot_record:${eventId}`);
    }
    const ocrMeta = record.metadata?.sourceMessageId;
    if (typeof ocrMeta !== "string" || !ocrMeta.startsWith("ocr-cand-")) {
      fail(`ssot_metadata:${eventId}`);
    }
  }

  if (reminders.length < commit.events.length) {
    fail("reminderCreated");
  }

  if (linkReminderChips.length < commit.events.length) {
    fail("calendarBoardVisible");
  }

  const ssotConsistent = commit.events.every((row) => {
    const record = findEventCandidate(row.eventCandidateId);
    return (
      record?.title === row.title &&
      record?.datetime === row.start &&
      record?.lifecycle === "scheduled"
    );
  });

  if (!ssotConsistent) {
    fail("ssotConsistency");
  }

  return {
    scheduledInStore,
    reminders,
    linkReminderChips,
    ssotConsistent,
  };
}

const ocr = setupOcrReview();
if (!ocr || getReviewState().type !== "PENDING_EVENT_REVIEW") {
  fail("ocr_or_review_setup");
}

const review = getReviewState();
applyPendingEventCandidateDatePatches(
  review.candidateIds.map((candidateId) => ({
    candidateId,
    date: "2026-06-03",
  }))
);
const directCommit = executeApprovePendingEvents({
  candidateIds: review.candidateIds,
});

const verified = verifyCommit(directCommit);

setupOcrReview();
applyPendingEventCandidateDatePatches(
  getReviewState().candidateIds.map((candidateId) => ({
    candidateId,
    date: "2026-06-03",
  }))
);
const approval = orchestrateEventReviewApproval({ message: "응" });
if (!approval || approval.meta?.execution_route !== "CALENDAR_COMMIT") {
  fail("orchestrated_approval_route");
}
const orchestratedScheduled = readEventCandidatesRaw().filter(
  (item) => item.lifecycle === "scheduled"
);
const orchestratedReminders = readLinkReminders().filter((item) =>
  item.linkId.startsWith("ocr-event-")
);

if (orchestratedScheduled.length === 0 || orchestratedReminders.length === 0) {
  fail("orchestrated_approval_dual_write");
}

const writeTrace = [
  {
    function: "executeApprovePendingEvents",
    file: "lib/event-kernel/review/execute-approve-pending-events.ts",
    calls: "commitApprovedCandidate",
    sideEffect: "dual commit per OCR row",
  },
  {
    function: "commitOcrCandidateToEventStore",
    file: "lib/event-kernel/review/commit-ocr-candidate-to-event-store.ts",
    calls: "ingestScheduleSignal",
    sideEffect: "authoritative schedule ingest",
  },
  {
    function: "ingestScheduleSignal",
    file: "lib/events/event-ingest-pipeline.ts",
    calls: "upsertEventCandidate",
    sideEffect: "lifecycle scheduled",
  },
  {
    function: "upsertEventCandidate",
    file: "lib/events/event-store.ts",
    calls: "writePayload",
    sideEffect: "rimvio-event-candidates.v1 / memoryStore",
  },
  {
    function: "scheduleLinkReminderAt",
    file: "lib/local-links/reminders.ts",
    calls: "writeJson",
    sideEffect: "blink-reminders preserved",
  },
];

const audit = {
  eventCandidateWritten: directCommit.eventCandidateIds.length > 0,
  eventStoreUpdated: verified.scheduledInStore.length >= directCommit.eventCandidateIds.length,
  calendarBoardVisible:
    verified.linkReminderChips.length >= directCommit.events.length,
  reminderCreated: verified.reminders.length >= directCommit.events.length,
  ssotConsistency: verified.ssotConsistent,
  orchestratedApprovalAlsoWrites:
    orchestratedScheduled.length > 0 && orchestratedReminders.length > 0,
  violations,
  writeTrace,
  finalPersistenceLayer:
    "lib/events/event-store.ts → writePayload (EventCandidate canonical SSOT)",
  reminderPersistenceLayer:
    "lib/local-links/reminders.ts → writeJson (blink-reminders)",
};

console.log(JSON.stringify(audit, null, 2));

if (violations.length > 0) {
  process.exit(1);
}

assert.ok(audit.eventCandidateWritten);
console.log("test-event-candidate-commit-bridge: ok");
