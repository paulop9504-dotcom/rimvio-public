import { getActionProjectionRevision } from "@/lib/action-projection/action-projection-cache";
import { composeActionProjection } from "@/lib/action-projection/compose-action-projection";
import {
  getReviewState,
  type EventReviewState,
} from "@/lib/event-kernel/review/review-state";
import {
  loadPendingEventCandidates,
} from "@/lib/event-kernel/review/pending-event-candidate-store";
import { readLifeProjections } from "@/lib/life-read-model";
import type { EventOsStateSnapshot } from "@/lib/event-os/causal-trace-types";

export function snapshotEventOsState(
  scopeId = "default",
  now = new Date()
): EventOsStateSnapshot {
  const review: EventReviewState = getReviewState(scopeId);
  const pending = loadPendingEventCandidates(review.candidateIds, scopeId);
  const projection = composeActionProjection({ now });

  return {
    reviewState: review.type,
    reviewCandidateCount: review.candidateIds.length,
    pendingCandidates: pending.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      time: row.time,
    })),
    scheduledEventCount: readLifeProjections().events.filter(
      (event) => event.lifecycle === "scheduled",
    ).length,
    actionProjectionEntryCount: projection.entries.length,
    actionProjectionRevision: getActionProjectionRevision(),
  };
}

export function diffEventOsState(
  before: EventOsStateSnapshot,
  after: EventOsStateSnapshot
) {
  return {
    reviewStateChanged: before.reviewState !== after.reviewState,
    scheduledEventDelta: after.scheduledEventCount - before.scheduledEventCount,
    projectionRevisionDelta:
      after.actionProjectionRevision - before.actionProjectionRevision,
    projectionEntryDelta:
      after.actionProjectionEntryCount - before.actionProjectionEntryCount,
    pendingDateResolved: before.pendingCandidates.some(
      (row, index) => !row.date && Boolean(after.pendingCandidates[index]?.date)
    ),
  };
}
