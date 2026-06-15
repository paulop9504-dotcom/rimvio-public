#!/usr/bin/env npx tsx
import { getReviewState } from "../lib/event-kernel/review/review-state";
import { setupOcrReviewFlow } from "../lib/event-os/ocr-review-flow-setup";
import {
  traceApproveCandidate,
  traceConfirmCommit,
  traceSetCandidateDate,
} from "../lib/event-os/trace-event-os-interaction";

setupOcrReviewFlow();
const approve = traceApproveCandidate({ message: "맞아" });
const patches = getReviewState().candidateIds.map((candidateId) => ({
  candidateId,
  date: "2026-06-03",
}));
const date = traceSetCandidateDate({ patches });
const confirm = traceConfirmCommit({ syncClient: false });

console.log(
  JSON.stringify(
    {
      ocr_approve_missing_date: approve.proofHash,
      ocr_date_resolved: date.proofHash,
      ocr_confirm_executed: confirm.proofHash,
    },
    null,
    2
  )
);
