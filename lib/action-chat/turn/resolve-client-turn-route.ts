import type { ComposerAttachment } from "@/lib/action-chat/composer-attachments";
import type { ParsedTurnIntent } from "@/lib/action-chat/turn/parse-turn-intent";
import type { ClientTurnRoute } from "@/lib/action-chat/turn/route-client-turn";
import { isCommandOsInput } from "@/lib/command-os/parse-command-input";
import { isParkingPhotoCapturePending } from "@/lib/local-parking/parking-photo-session";
import { isAwaitingLectureUrl } from "@/lib/contextual-aux/study/study-aux-session";
import { resolveStudyAuxFromLabel } from "@/lib/contextual-aux/study/resolve-study-action-label";
import { classifyApprovalSpeechAct } from "@/lib/event-kernel/review/classify-approval-speech-act";
import { OCR_REVIEW_DATES_PREFIX } from "@/lib/event-kernel/review/pending-event-candidate-dates";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";

export { OCR_REVIEW_DATES_PREFIX };

export type ClientTurnRouteResolveInput = {
  sending: boolean;
  turnIntent: ParsedTurnIntent;
  pendingAttachments: ComposerAttachment[];
  messages: readonly ActionChatMessage[];
  routeToFeedPeerTalk: boolean;
  reviewGatePhase: string | null;
};

/** Sync client turn routing — handlers stay in the hook until execute-* modules land. */
export function resolveClientTurnRoute(input: ClientTurnRouteResolveInput): ClientTurnRoute {
  const { turnIntent, pendingAttachments, messages } = input;
  const trimmed = turnIntent.trimmed;

  if (input.sending || turnIntent.isEmpty) {
    return { kind: "noop", reason: input.sending ? "sending" : "empty" };
  }

  if (input.routeToFeedPeerTalk && pendingAttachments.length === 0 && trimmed) {
    return { kind: "peer_talk" };
  }

  if (pendingAttachments.length > 0 && isParkingPhotoCapturePending()) {
    return { kind: "parking_photo" };
  }

  if (isAwaitingLectureUrl() && pendingAttachments.length === 0 && trimmed) {
    return { kind: "lecture_url" };
  }

  if (resolveStudyAuxFromLabel(trimmed) && pendingAttachments.length === 0) {
    return { kind: "study_label" };
  }

  if (isCommandOsInput(trimmed)) {
    return { kind: "command_os" };
  }

  if (trimmed.startsWith(OCR_REVIEW_DATES_PREFIX)) {
    return { kind: "ocr_review_dates" };
  }

  if (
    classifyApprovalSpeechAct(trimmed) === "APPROVE" &&
    input.reviewGatePhase &&
    pendingAttachments.length === 0
  ) {
    return { kind: "review_approval" };
  }

  return { kind: "orchestrate_api" };
}
