import { resolveDisclosureTier } from "@/lib/action-chat/action-confidence";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type {
  GoalAlignableActionKind,
  GoalPriorityHint,
  GoalSnapshot,
} from "@/lib/goal-engine/types";

const MEAL_QUERY =
  /(?:배고파|맛집|먹|식사|한끼|밥|저녁|점심|아침|야식|굶|허기|레스토랑|카페\s*추천)/iu;

const SCHEDULE_TIER_DETAILS = new Set([
  "ScheduleListBatch",
  "TemporalSchedule",
  "TimeDecision",
  "MorningBriefing",
  "ScheduleIntelligence",
  "ScheduleAdvisory",
]);

const NAVIGATE_TIER_DETAILS = new Set([
  "TravelTripAnnouncement",
  "ScheduledTravel",
  "DeepLinkDispatch",
]);

/** Minimum confidence when actions exist — avoids disclosure "low" emptying actions. */
const SUPPRESS_CONFIDENCE_FLOOR = 0.61;

const PREFER_CONFIDENCE_BOOST = 0.08;
const SUPPRESS_CONFIDENCE_PENALTY = 0.1;
const HORIZON_SCHEDULE_BOOST = 0.07;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function kindMatchesHint(
  kind: GoalAlignableActionKind,
  kinds: string[] | undefined,
): boolean {
  if (!kinds?.length) {
    return false;
  }
  return kinds.includes(kind);
}

/** Meal discovery is still place-tier — `suppress place` applies to meal queries. */
function isSuppressedForKind(
  kind: GoalAlignableActionKind,
  suppress: string[] | undefined,
): boolean {
  if (!suppress?.length) {
    return false;
  }
  if (kindMatchesHint(kind, suppress)) {
    return true;
  }
  return kind === "meal" && kindMatchesHint("place", suppress);
}

export function inferTierActionKind(
  tierDetail: string | undefined,
  userMessage: string,
): GoalAlignableActionKind {
  if (!tierDetail) {
    return "generic";
  }

  if (tierDetail === "PlaceRecommendation") {
    return MEAL_QUERY.test(userMessage) ? "meal" : "place";
  }

  if (SCHEDULE_TIER_DETAILS.has(tierDetail)) {
    return "schedule";
  }

  if (NAVIGATE_TIER_DETAILS.has(tierDetail)) {
    return "navigate";
  }

  if (tierDetail === "ExperienceGuidance") {
    return "generic";
  }

  return "generic";
}

function buildCertificationMealNudge(): string {
  return "시험 준비가 우선순위로 잡혀 있으니 빠르게 식사할 수 있는 곳 위주로 추천드릴게요.";
}

function resolveTierGoalNudge(input: {
  goalSnapshot: GoalSnapshot | null;
  goalPriorityHint: GoalPriorityHint | null;
  tierDetail: string | undefined;
  userMessage: string;
  actionKind: GoalAlignableActionKind;
}): string | undefined {
  const { goalSnapshot, goalPriorityHint, tierDetail, userMessage, actionKind } =
    input;
  const suppress = goalPriorityHint?.suppressKinds ?? [];

  if (
    tierDetail === "PlaceRecommendation" &&
    goalSnapshot?.primaryFocus === "certification" &&
    MEAL_QUERY.test(userMessage) &&
    isSuppressedForKind("meal", suppress)
  ) {
    return buildCertificationMealNudge();
  }

  const hintNudge = goalPriorityHint?.nudgeMessage?.trim();
  if (!hintNudge) {
    return undefined;
  }

  if (
    tierDetail === "PlaceRecommendation" &&
    isSuppressedForKind(actionKind, suppress)
  ) {
    return hintNudge;
  }

  if (kindMatchesHint(actionKind, goalPriorityHint?.preferKinds)) {
    return hintNudge;
  }

  if (SCHEDULE_TIER_DETAILS.has(tierDetail ?? "") && actionKind === "schedule") {
    return hintNudge;
  }

  return undefined;
}

function prependMealSoftLead(
  summary: string,
  focus: GoalSnapshot["primaryFocus"] | undefined,
): string {
  const lead = "근처 식사 가능한 곳은 여기예요.";
  if (summary.includes(lead)) {
    return summary;
  }
  if (focus === "certification" || focus === "revenue") {
    return `${lead}\n\n${summary}`;
  }
  return summary;
}

function appendNudgeOnce(summary: string, nudge: string): string {
  if (!nudge.trim() || summary.includes(nudge)) {
    return summary;
  }
  return `${summary.trim()}\n\n${nudge.trim()}`;
}

/**
 * Hook B (§4.2) — adjust Tier-5 results from ctx.goalSnapshot / ctx.goalPriorityHint only.
 * Never blocks tiers, removes actions, or returns empty.
 */
export function applyTierGoalPolicy(
  result: OrchestratorResult,
  input: {
    goalSnapshot: GoalSnapshot | null;
    goalPriorityHint: GoalPriorityHint | null;
    tierDetail?: string;
    userMessage: string;
  },
): OrchestratorResult {
  const { goalSnapshot, goalPriorityHint, tierDetail, userMessage } = input;
  if (!goalSnapshot && !goalPriorityHint) {
    return result;
  }

  const actionKind = inferTierActionKind(tierDetail, userMessage);
  const prefer = goalPriorityHint?.preferKinds;
  const suppress = goalPriorityHint?.suppressKinds;

  let confidence = result.confidence ?? (result.actions.length > 0 ? 0.8 : 1);

  if (kindMatchesHint(actionKind, prefer)) {
    confidence = clamp01(confidence + PREFER_CONFIDENCE_BOOST);
  }

  if (isSuppressedForKind(actionKind, suppress)) {
    confidence = Math.max(
      result.actions.length > 0 ? SUPPRESS_CONFIDENCE_FLOOR : 0,
      clamp01(confidence - SUPPRESS_CONFIDENCE_PENALTY),
    );
  }

  if (
    goalSnapshot?.eventHorizonSummary?.severity === "high" &&
    actionKind === "schedule"
  ) {
    confidence = clamp01(confidence + HORIZON_SCHEDULE_BOOST);
  }

  let summary = result.summary;

  if (
    tierDetail === "PlaceRecommendation" &&
    MEAL_QUERY.test(userMessage) &&
    isSuppressedForKind(actionKind, suppress)
  ) {
    summary = prependMealSoftLead(summary, goalSnapshot?.primaryFocus);
  }

  const nudge = resolveTierGoalNudge({
    goalSnapshot,
    goalPriorityHint,
    tierDetail,
    userMessage,
    actionKind,
  });
  if (nudge) {
    summary = appendNudgeOnce(summary, nudge);
  }

  const disclosure = resolveDisclosureTier(confidence);

  return {
    ...result,
    summary,
    confidence,
    disclosure,
  };
}
