import type { PendingEventCandidate } from "@/lib/event-kernel/review/pending-event-candidate-store";
import { validatePendingEventCandidate } from "@/lib/event-kernel/review/validate-pending-event-candidate";
import { ingestScheduleSignal } from "@/lib/events/event-ingest-pipeline";
import type { EventCandidate } from "@/lib/events/event-candidate";

/**
 * Canonical SSOT write for approved OCR rows.
 * Authoritative path: ingestScheduleSignal → commit-truth.
 */
export function commitOcrCandidateToEventStore(
  candidate: PendingEventCandidate
): EventCandidate {
  const validation = validatePendingEventCandidate(candidate);
  if (validation.blockedBy.length > 0) {
    throw new Error(
      `event_candidate_commit_blocked:${candidate.id}:${validation.blockedBy.join(",")}`
    );
  }

  if (!candidate.start?.trim()) {
    throw new Error(`event_candidate_commit_blocked:${candidate.id}:empty_start`);
  }

  const record = ingestScheduleSignal({
    title: candidate.title,
    datetime: candidate.start,
    category: "schedule",
    sourceMessage: `ocr-review:${candidate.id}`,
    sourceMessageId: candidate.id,
  });

  if (!record || record.lifecycle !== "scheduled") {
    throw new Error(`event_candidate_commit_failed:${candidate.id}`);
  }

  return record;
}
