import { extractPlanWindowFromText } from "@/lib/plan-context/extract-plan-window";
import { resolvePlanAttach } from "@/lib/plan-context/resolve-plan-attach";
import type {
  PlanAttachResolution,
  PlanContext,
  PlanWindowConfidence,
} from "@/lib/plan-context/plan-context-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ScheduleIntentKind } from "@/lib/peer-chat/ai-lens/classify-schedule-intent";
import { isPeerThreadId } from "@/lib/peer-chat/group-thread";

export type BuildPlanContextDraftInput = {
  title: string;
  windowStartIso?: string;
  place?: string;
  peerDisplayName?: string;
  peerThreadId?: string;
  conversationText: string;
  intentKind?: ScheduleIntentKind;
  events: readonly EventCandidate[];
};

export type PlanContextDraft = {
  context: PlanContext;
  attach: PlanAttachResolution;
};

export function buildPlanContextDraft(input: BuildPlanContextDraftInput): PlanContextDraft {
  const extracted = extractPlanWindowFromText(
    input.conversationText,
    input.windowStartIso,
  );

  const attach = resolvePlanAttach({
    title: input.title,
    windowStartIso: input.windowStartIso,
    windowEndIso: extracted.windowEndIso,
    place: input.place,
    peerDisplayName: input.peerDisplayName,
    intentKind: input.intentKind,
    events: input.events,
  });

  const attachMode = attach.canContinue ? attach.mode : "new";

  const context: PlanContext = {
    title: input.title,
    windowStartIso: input.windowStartIso,
    windowEndIso: extracted.windowEndIso ?? null,
    windowConfidence: extracted.windowConfidence,
    nights: extracted.nights,
    place: input.place ?? null,
    peerDisplayName: input.peerDisplayName ?? null,
    peerThreadId: input.peerThreadId ?? null,
    attachMode,
    planId: attachMode === "continue" ? attach.candidatePlanId : undefined,
    planMode:
      input.peerDisplayName?.trim() ||
      (input.peerThreadId?.trim() && isPeerThreadId(input.peerThreadId.trim()))
        ? "group"
        : "solo",
  };

  return { context, attach };
}

export function mergePlanContextEdits(
  base: PlanContext,
  edits: {
    windowStartIso?: string;
    windowEndIso?: string | null;
    nights?: number;
    windowConfidence?: PlanWindowConfidence;
    place?: string | null;
    attachMode?: PlanContext["attachMode"];
    planId?: string;
  },
): PlanContext {
  return {
    ...base,
    windowStartIso: edits.windowStartIso ?? base.windowStartIso,
    windowEndIso:
      edits.windowEndIso !== undefined ? edits.windowEndIso : base.windowEndIso,
    nights: edits.nights ?? base.nights,
    windowConfidence: edits.windowConfidence ?? base.windowConfidence,
    place: edits.place !== undefined ? edits.place : base.place,
    attachMode: edits.attachMode ?? base.attachMode,
    planId: edits.planId ?? base.planId,
  };
}
