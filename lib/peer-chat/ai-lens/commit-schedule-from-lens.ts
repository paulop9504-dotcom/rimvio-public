import { ingestScheduleSignal } from "@/lib/events/event-ingest-pipeline";
import { findEventCandidate } from "@/lib/events/event-store";
import type { ScheduleIntentProfile } from "@/lib/peer-chat/ai-lens/classify-schedule-intent";
import { recordLensBubbleClick } from "@/lib/peer-chat/ai-lens/lens-user-history";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { stampPlanContextMetadata } from "@/lib/plan-context/plan-context-metadata";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type CommitLensScheduleInput = {
  candidate: DeepLinkBubbleCandidate;
  sourceMessageId?: string;
  peerDisplayName?: string;
  promoteToFeed: boolean;
  intent: ScheduleIntentProfile;
  datetimeIso?: string;
  title: string;
  place?: string;
  planContext: PlanContext;
};

export type CommitLensScheduleResult = {
  ok: boolean;
  message: string;
  eventId?: string;
};

export function commitLensScheduleFromConfirm(
  input: CommitLensScheduleInput,
): CommitLensScheduleResult {
  recordLensBubbleClick(input.candidate.actionType);

  const category =
    input.candidate.payload?.category === "entertainment"
      ? "entertainment"
      : input.candidate.actionType === "movie_schedule"
        ? "entertainment"
        : "schedule";

  const continuing =
    input.planContext.attachMode === "continue" && input.planContext.planId?.trim();
  const existing = continuing
    ? findEventCandidate(input.planContext.planId!.trim())
    : null;

  const resolvedTitle =
    continuing && existing?.title?.trim() ? existing.title : input.title;

  const event = ingestScheduleSignal({
    eventId: continuing ? input.planContext.planId : undefined,
    sourceMessageId: input.sourceMessageId,
    title: resolvedTitle,
    datetime: input.datetimeIso ?? existing?.datetime,
    place: input.place ?? existing?.place,
    category: category === "entertainment" ? "schedule" : category,
  });

  if (!event) {
    return { ok: false, message: "일정을 저장하지 못했어요. 시간을 다시 확인해 주세요" };
  }

  const shouldFeed =
    input.promoteToFeed ||
    continuing ||
    input.intent.kind === "plan" ||
    event.metadata?.feedPlanEnabled === true;

  const shouldStampPlanContext =
    shouldFeed || Boolean(input.planContext.peerThreadId?.trim());

  if (shouldStampPlanContext) {
    const planContext: PlanContext = {
      ...input.planContext,
      planId: event.id,
      title: resolvedTitle,
      windowStartIso: input.datetimeIso ?? event.datetime,
      place: input.place ?? event.place ?? null,
    };

    const metadata = stampPlanContextMetadata(
      {
        ...event.metadata,
        ...(shouldFeed
          ? {
              feedPlanEnabled: true,
              planHorizon: input.intent.horizon,
              planKind: input.intent.kind,
            }
          : {}),
        peerDisplayName: input.peerDisplayName?.trim() || planContext.peerDisplayName,
        lensSource: "peer_chat",
      },
      planContext,
    );

    commitEventUpsert({
      id: event.id,
      title: resolvedTitle,
      category: event.category,
      source: event.source,
      lifecycle:
        shouldFeed && (input.intent.kind === "plan" || continuing)
          ? "active"
          : "scheduled",
      datetime: planContext.windowStartIso ?? event.datetime,
      place: planContext.place ?? event.place,
      containerId: event.containerId,
      confidence: Math.min(0.95, (event.confidence ?? 0.75) + 0.05),
      metadata,
    });
  }

  const continued = continuing && existing;
  return {
    ok: true,
    eventId: event.id,
    message: continued
      ? `「${resolvedTitle}」 계획에 이어서 저장했어요`
      : shouldFeed
        ? input.intent.toastWithFeed
        : input.intent.toastCalendarOnly,
  };
}
