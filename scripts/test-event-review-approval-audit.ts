#!/usr/bin/env npx tsx
import { orchestrateOcrScheduleCandidates } from "../lib/events/orchestrate-ocr-schedule-candidates";
import { orchestrateEventReviewApproval } from "../lib/events/orchestrate-event-review-approval";
import {
  inferApprovalAction,
  APPROVE_PENDING_EVENTS,
} from "../lib/event-kernel/review/infer-approval-action";
import { getReviewState, resetReviewStateForTests } from "../lib/event-kernel/review/review-state";
import {
  applyPendingEventCandidateDatePatches,
  resetPendingEventCandidatesForTests,
} from "../lib/event-kernel/review/pending-event-candidate-store";
import { resetLinkRemindersForTests } from "../lib/local-links/reminders";
import { orchestrateEntityQuickPick } from "../lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { resetKernelMemoryStoreForTests } from "../lib/event-kernel";

const OCR_BLOCK = `[첨부1·사진] schedule.png
[첨부1·OCR본문]
7시 기상
9~11 보험 상담
11:30 점심
[첨부1·Vision] x`;

const APPROVAL_PHRASES = [
  "응",
  "응 넣어",
  "좋아",
  "맞아",
  "캘린더에 넣어줘",
  "등록해줘",
  "일정으로 만들어줘",
];

const violations: string[] = [];

function fail(reason: string) {
  violations.push(reason);
}

resetReviewStateForTests();
resetPendingEventCandidatesForTests();
resetLinkRemindersForTests();
resetKernelMemoryStoreForTests();

const ocr = orchestrateOcrScheduleCandidates({
  composerContext: OCR_BLOCK,
  referenceDate: "2026-06-01",
});

if (!ocr) {
  fail("ocr_review_not_generated");
}

const reviewAfterOcr = getReviewState();
if (reviewAfterOcr.type !== "PENDING_EVENT_REVIEW") {
  fail(`review_state_after_ocr expected PENDING_EVENT_REVIEW got ${reviewAfterOcr.type}`);
}

const meta = ocr?.metadata as { pending_event_candidates?: boolean } | undefined;
if (!meta?.pending_event_candidates) {
  fail("pending_event_candidates_flag_missing_on_ocr");
}

for (const phrase of APPROVAL_PHRASES) {
  resetReviewStateForTests();
  resetPendingEventCandidatesForTests();
  resetLinkRemindersForTests();
  resetKernelMemoryStoreForTests();

  orchestrateOcrScheduleCandidates({
    composerContext: OCR_BLOCK,
    referenceDate: "2026-06-01",
  });

  if (getReviewState().type !== "PENDING_EVENT_REVIEW") {
    fail(`${phrase}: setup review state failed`);
    continue;
  }

  const approval = inferApprovalAction(phrase);
  if (approval !== APPROVE_PENDING_EVENTS) {
    fail(`${phrase}: approval_action expected APPROVE_PENDING_EVENTS got ${approval ?? "null"}`);
  }

  const blocked = orchestrateEventReviewApproval({ message: phrase });
  if (!blocked) {
    fail(`${phrase}: orchestrateEventReviewApproval returned null`);
    continue;
  }

  if (blocked.meta?.approval_detected !== true) {
    fail(`${phrase}: approval_detected not true`);
  }

  if (blocked.meta?.execution_route !== "EVENT_REVIEW_DATE_PICKER") {
    fail(
      `${phrase}: expected EVENT_REVIEW_DATE_PICKER got ${String(blocked.meta?.execution_route)}`
    );
  }

  applyPendingEventCandidateDatePatches(
    getReviewState().candidateIds.map((candidateId) => ({
      candidateId,
      date: "2026-06-03",
    }))
  );

  const result = orchestrateEventReviewApproval({ message: phrase });
  if (!result) {
    fail(`${phrase}: second approval returned null`);
    continue;
  }

  if (result.meta?.approval_action !== APPROVE_PENDING_EVENTS) {
    fail(`${phrase}: meta.approval_action mismatch`);
  }

  if (result.meta?.execution_route !== "CALENDAR_COMMIT") {
    fail(
      `${phrase}: execution_route expected CALENDAR_COMMIT got ${String(result.meta?.execution_route)}`
    );
  }

  if (getReviewState().type !== "EVENTS_APPROVED") {
    fail(`${phrase}: review should be EVENTS_APPROVED after commit`);
  }
}

for (const phrase of APPROVAL_PHRASES) {
  resetReviewStateForTests();
  resetPendingEventCandidatesForTests();
  orchestrateOcrScheduleCandidates({
    composerContext: OCR_BLOCK,
    referenceDate: "2026-06-01",
  });

  if (orchestrateEntityQuickPick(phrase)) {
    fail(`${phrase}: EntityQuickPick blocked while PENDING_EVENT_REVIEW`);
  }

  applyPendingEventCandidateDatePatches(
    getReviewState().candidateIds.map((candidateId) => ({
      candidateId,
      date: "2026-06-03",
    }))
  );

  if (!orchestrateEventReviewApproval({ message: phrase })) {
    fail(`${phrase}: approval orchestration failed on pending review`);
  }
}

const status = violations.length === 0 ? "PASS" : "FAIL";

console.log(
  JSON.stringify(
    {
      status,
      review_state: reviewAfterOcr.type === "PENDING_EVENT_REVIEW" ? "OK" : "FAIL",
      approval_contract: violations.some((v) => v.includes("approval")) ? "FAIL" : "OK",
      calendar_commit: violations.some((v) => v.includes("calendar") || v.includes("commit"))
        ? "FAIL"
        : "OK",
      violations,
    },
    null,
    2
  )
);

if (status === "FAIL") {
  process.exit(1);
}
