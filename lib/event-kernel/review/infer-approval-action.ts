import { classifyApprovalSpeechAct } from "@/lib/event-kernel/review/classify-approval-speech-act";
import { getReviewState } from "@/lib/event-kernel/review/review-state";

export const APPROVE_PENDING_EVENTS = "APPROVE_PENDING_EVENTS" as const;
export const REJECT_PENDING_EVENTS = "REJECT_PENDING_EVENTS" as const;

export type ApprovalAction =
  | typeof APPROVE_PENDING_EVENTS
  | typeof REJECT_PENDING_EVENTS;

/**
 * State-driven approval contract — only when review is pending.
 */
export function inferApprovalAction(
  message: string,
  scopeId?: string
): ApprovalAction | null {
  const review = getReviewState(scopeId);
  if (review.type !== "PENDING_EVENT_REVIEW") {
    return null;
  }

  const act = classifyApprovalSpeechAct(message);
  if (act === "APPROVE") {
    return APPROVE_PENDING_EVENTS;
  }
  if (act === "REJECT") {
    return REJECT_PENDING_EVENTS;
  }

  return null;
}

export function hasPendingEventReview(scopeId?: string): boolean {
  return getReviewState(scopeId).type === "PENDING_EVENT_REVIEW";
}
