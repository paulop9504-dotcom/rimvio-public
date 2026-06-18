import {
  classifyCommitSpeech,
  isCommitRejectMessage,
} from "@/lib/action-chat/commit-speech";

export type ApprovalSpeechAct = "APPROVE" | "REJECT" | "NONE";

/**
 * Speech-act classifier for event review — wording alone is not enough;
 * caller must gate on PENDING_EVENT_REVIEW.
 */
export function classifyApprovalSpeechAct(message: string): ApprovalSpeechAct {
  if (isCommitRejectMessage(message)) {
    return "REJECT";
  }
  const analysis = classifyCommitSpeech(message);
  if (analysis.act === "APPROVE") {
    return "APPROVE";
  }
  return "NONE";
}

export { classifyCommitSpeech } from "@/lib/action-chat/commit-speech";
