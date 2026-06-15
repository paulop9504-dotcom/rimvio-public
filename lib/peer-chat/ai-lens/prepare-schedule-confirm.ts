import { classifyScheduleIntent } from "@/lib/peer-chat/ai-lens/classify-schedule-intent";
import { detectScheduleConflict } from "@/lib/peer-chat/ai-lens/detect-schedule-conflict";
import {
  formatScheduleConfirmWhen,
  resolveScheduleDatetime,
} from "@/lib/peer-chat/ai-lens/resolve-schedule-datetime";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import type { ScheduleIntentProfile } from "@/lib/peer-chat/ai-lens/classify-schedule-intent";
import type { ScheduleConflict } from "@/lib/peer-chat/ai-lens/detect-schedule-conflict";
import { buildPlanContextDraft } from "@/lib/plan-context/build-plan-context-draft";
import type {
  PlanAttachResolution,
  PlanContext,
} from "@/lib/plan-context/plan-context-types";
import { listEventCandidates } from "@/lib/events/event-store";

export type ScheduleConfirmDraft = {
  candidate: DeepLinkBubbleCandidate;
  title: string;
  whenLabel: string;
  datetimeIso?: string;
  place?: string;
  peerDisplayName?: string;
  sourceMessageId?: string;
  intent: ScheduleIntentProfile;
  conflict: ScheduleConflict;
  /** 기본 체크 — 계획형만 ON */
  feedOptInDefault: boolean;
  /** Time × space bundle */
  planContext: PlanContext;
  planAttach: PlanAttachResolution;
};

export function isScheduleLensAction(actionType: DeepLinkBubbleCandidate["actionType"]): boolean {
  return actionType === "schedule" || actionType === "movie_schedule";
}

export function prepareScheduleConfirmDraft(input: {
  candidate: DeepLinkBubbleCandidate;
  sourceMessageId?: string;
  peerDisplayName?: string;
  /** Active ROOM — stamped as planPeerThreadId on Feed plan commit. */
  peerThreadId?: string;
}): ScheduleConfirmDraft {
  const payload = input.candidate.payload;
  const datetimeIso = resolveScheduleDatetime(payload);
  const title = payload?.title?.trim() || input.candidate.label.replace(/^[^\s]+\s/, "").trim() || "일정";
  const intent = classifyScheduleIntent({
    title,
    reason: input.candidate.reason,
    actionType: input.candidate.actionType,
    hasDatetime: Boolean(datetimeIso),
    peerDisplayName: input.peerDisplayName,
  });
  const events = listEventCandidates();
  const conflict = detectScheduleConflict({
    title,
    datetime: datetimeIso,
    place: payload?.place?.trim() || undefined,
    sourceMessageId: input.sourceMessageId,
    events,
  });

  const conversationText = [
    title,
    input.candidate.reason,
    payload?.place,
    input.peerDisplayName ? `${input.peerDisplayName}이랑` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const { context: planContext, attach: planAttach } = buildPlanContextDraft({
    title,
    windowStartIso: datetimeIso,
    place: payload?.place?.trim() || undefined,
    peerDisplayName: input.peerDisplayName,
    peerThreadId: input.peerThreadId?.trim() || undefined,
    conversationText,
    intentKind: intent.kind,
    events,
  });

  return {
    candidate: input.candidate,
    title,
    whenLabel: formatScheduleConfirmWhen(datetimeIso),
    datetimeIso,
    place: payload?.place?.trim() || undefined,
    peerDisplayName: input.peerDisplayName,
    sourceMessageId: input.sourceMessageId,
    intent,
    conflict,
    feedOptInDefault:
      intent.suggestFeed && (conflict.kind === "none" || planAttach.canContinue),
    planContext,
    planAttach,
  };
}
