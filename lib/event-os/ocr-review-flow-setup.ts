import { resetActionProjectionCacheForTests } from "@/lib/action-projection/action-projection-cache";
import {
  enableDeterministicPendingIdsForTests,
  resetPendingEventCandidatesForTests,
} from "@/lib/event-kernel/review/pending-event-candidate-store";
import { resetReviewStateForTests } from "@/lib/event-kernel/review/review-state";
import { resetReviewExecutionLocksForTests } from "@/lib/event-os/review-execution-lock";
import { resetReviewExecutionQueueForTests } from "@/lib/event-os/review-execution-queue-state";
import { resetProofPersistStoreForTests } from "@/lib/event-os/runtime/proof-persist-store";
import { eventOSOrchestrator } from "@/lib/event-os/runtime/event-os-orchestrator";
import { resetEventCandidatesForTests } from "@/lib/events/event-store";
import { orchestrateOcrScheduleCandidates } from "@/lib/events/orchestrate-ocr-schedule-candidates";

export const DEFAULT_OCR_REVIEW_BLOCK = `[첨부1·사진] schedule.png
[첨부1·OCR본문]
7시 기상
11:30 점심
14시 병원
[첨부1·Vision] x`;

export function resetOcrReviewFlowForTests(): void {
  enableDeterministicPendingIdsForTests();
  resetReviewStateForTests();
  resetPendingEventCandidatesForTests();
  resetEventCandidatesForTests();
  resetActionProjectionCacheForTests();
  resetReviewExecutionLocksForTests();
  resetReviewExecutionQueueForTests();
  resetProofPersistStoreForTests();
  eventOSOrchestrator.resetRuntimeCountersForTests();
}

export function setupOcrReviewFlow(input?: {
  composerContext?: string;
  referenceDate?: string;
}): void {
  resetOcrReviewFlowForTests();
  orchestrateOcrScheduleCandidates({
    composerContext: input?.composerContext ?? DEFAULT_OCR_REVIEW_BLOCK,
    referenceDate: input?.referenceDate ?? "2026-06-01",
  });
}
