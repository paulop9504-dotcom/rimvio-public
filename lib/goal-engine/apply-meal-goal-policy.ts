import { hasGoalConstraint } from "@/lib/goal-engine/goal-constraint-helpers";
import type {
  GoalFocusKind,
  GoalPriorityHint,
  GoalSnapshot,
} from "@/lib/goal-engine/types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type {
  FoodCandidate,
  RankedCandidate,
  RecommendationResult,
} from "@/lib/event-os/contextual-recommendation/recommendation-types";
import type { ContextualMealOrchestratorPayload } from "@/lib/event-os/contextual-recommendation/orchestrate-contextual-meal";

const GOAL_MEAL_SCORE_BONUS_MAX = 14;

type MealTraitLabel = string;

function isLateNight(clock: Date | undefined): boolean {
  if (!clock) {
    return false;
  }
  const hour = clock.getHours();
  return hour >= 22 || hour < 5;
}

function goalMealScoreBonus(
  candidate: FoodCandidate,
  snapshot: GoalSnapshot,
  hint: GoalPriorityHint | null | undefined,
  clock?: Date,
): number {
  const focus = snapshot.primaryFocus;
  let bonus = 0;

  const light = 1 - candidate.heaviness;
  const heavy = candidate.heaviness;

  if (focus === "revenue") {
    bonus += light * GOAL_MEAL_SCORE_BONUS_MAX * 0.55;
    bonus -= heavy > 0.62 ? GOAL_MEAL_SCORE_BONUS_MAX * 0.35 : 0;
  } else if (focus === "certification") {
    bonus += light * GOAL_MEAL_SCORE_BONUS_MAX * 0.45;
    bonus += candidate.nutritionBalance * GOAL_MEAL_SCORE_BONUS_MAX * 0.2;
    bonus -= heavy > 0.6 ? GOAL_MEAL_SCORE_BONUS_MAX * 0.4 : 0;
  } else if (focus === "wellbeing") {
    bonus += candidate.nutritionBalance * GOAL_MEAL_SCORE_BONUS_MAX * 0.55;
    bonus += light * GOAL_MEAL_SCORE_BONUS_MAX * 0.25;
  }

  if (hasGoalConstraint(snapshot, "avoidTravel")) {
    bonus += light * 4;
  }

  if (hasGoalConstraint(snapshot, "avoidLateNight") && isLateNight(clock)) {
    bonus -= heavy * 8;
    if (candidate.category === "fried" || candidate.category === "burger") {
      bonus -= 6;
    }
  }

  if (hasGoalConstraint(snapshot, "needLunchWindow")) {
    bonus += 6;
  }

  if (hint?.preferKinds?.includes("meal")) {
    bonus += 4;
  }

  return Math.round(bonus * 10) / 10;
}

function traitLabelForCandidate(
  focus: GoalFocusKind,
  candidate: FoodCandidate,
  rankIndex: number,
): MealTraitLabel {
  if (focus === "revenue") {
    if (candidate.heaviness <= 0.35) {
      return "이동 적음";
    }
    if (candidate.heaviness <= 0.5) {
      return "대기시간 짧음";
    }
    return "빠른 식사";
  }

  if (focus === "certification") {
    const certTraits: MealTraitLabel[] = [
      "조용한 식사 가능",
      "빠른 식사 가능",
      "혼밥 가능",
    ];
    if (candidate.heaviness <= 0.3) {
      return "혼밥 가능";
    }
    if (candidate.heaviness <= 0.45) {
      return "빠른 식사 가능";
    }
    return certTraits[rankIndex % certTraits.length] ?? "조용한 식사 가능";
  }

  if (focus === "wellbeing") {
    if (candidate.nutritionBalance >= 0.85) {
      return "건강식";
    }
    if (candidate.heaviness <= 0.4) {
      return "휴식 가능";
    }
    return "컨디션 회복";
  }

  return candidate.item;
}

function candidateByItem(
  candidates: FoodCandidate[],
  item: string,
): FoodCandidate | undefined {
  return candidates.find((row) => row.item === item);
}

export type GoalRankedMealRow = RankedCandidate & {
  goalTraitLabel?: string;
  goalScoreBonus?: number;
};

function rerankWithGoalPolicy(
  result: RecommendationResult,
  snapshot: GoalSnapshot,
  hint: GoalPriorityHint | null | undefined,
  clock?: Date,
): GoalRankedMealRow[] {
  const rows: GoalRankedMealRow[] = result.rankedCandidates.map((row) => {
    const candidate = candidateByItem(result.candidates, row.item);
    const goalScoreBonus = candidate
      ? goalMealScoreBonus(candidate, snapshot, hint, clock)
      : 0;
    return {
      ...row,
      score: row.score + goalScoreBonus,
      goalScoreBonus,
    };
  });

  rows.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.item.localeCompare(right.item, "ko");
  });

  return rows.map((row, index) => {
    const candidate = candidateByItem(result.candidates, row.item);
    const goalTraitLabel = candidate
      ? traitLabelForCandidate(snapshot.primaryFocus, candidate, index)
      : row.item;
    return { ...row, goalTraitLabel };
  });
}

export function formatGoalAwareMealSummary(
  ranked: GoalRankedMealRow[],
  focus: GoalFocusKind,
): string {
  if (ranked.length === 0) {
    return "오늘 이렇게 가는 게 좋아 보여요:";
  }

  const lines = ranked.map((row, index) => {
    const label =
      focus === "none"
        ? row.item
        : `${row.goalTraitLabel ?? row.item} ${row.item}`;
    return `${index + 1}. ${label} (${row.score}점)`;
  });

  return ["오늘 이렇게 가는 게 좋아 보여요:", ...lines].join("\n");
}

export function formatMealGoalNudge(
  snapshot: GoalSnapshot,
  hint: GoalPriorityHint | null | undefined,
): string | null {
  if (snapshot.primaryFocus === "none" && !hint?.nudgeMessage?.trim()) {
    return null;
  }

  if (snapshot.primaryFocus === "certification") {
    return "식사는 추천드릴게요.\n\n다만 이번 주는 시험 준비가 우선순위로 잡혀 있어요.";
  }

  const hintLine = hint?.nudgeMessage?.trim();
  if (hintLine) {
    const body = hintLine.endsWith("요") || hintLine.endsWith(".")
      ? hintLine
      : `${hintLine}.`;
    return `식사는 추천드릴게요.\n\n다만 ${body}`;
  }

  return null;
}

export function appendMealGoalNudge(summary: string, nudge: string | null): string {
  if (!nudge?.trim() || summary.includes(nudge.trim())) {
    return summary;
  }
  return `${summary.trim()}\n\n${nudge.trim()}`;
}

/**
 * Hook D (§4.4) — rerank meal candidates and enrich labels; never removes rows.
 */
export function applyMealGoalPolicyToRecommendation(
  result: RecommendationResult,
  snapshot: GoalSnapshot | null | undefined,
  hint: GoalPriorityHint | null | undefined,
  clock?: Date,
): RecommendationResult {
  if (!snapshot || snapshot.primaryFocus === "none") {
    return result;
  }

  const rankedCandidates = rerankWithGoalPolicy(result, snapshot, hint, clock);

  return {
    ...result,
    rankedCandidates,
    decisionRationale: [
      result.decisionRationale,
      `Goal meal policy applied (focus=${snapshot.primaryFocus}).`,
    ].join(" "),
  };
}

export function applyMealGoalPolicyToOrchestrator(
  orchestrator: OrchestratorResult,
  recommendation: RecommendationResult,
  snapshot: GoalSnapshot | null | undefined,
  hint: GoalPriorityHint | null | undefined,
  clock?: Date,
): OrchestratorResult {
  if (!snapshot || snapshot.primaryFocus === "none") {
    return orchestrator;
  }

  const adjustedRecommendation = applyMealGoalPolicyToRecommendation(
    recommendation,
    snapshot,
    hint,
    clock,
  );

  const ranked = rerankWithGoalPolicy(adjustedRecommendation, snapshot, hint, clock);
  const summary = formatGoalAwareMealSummary(ranked, snapshot.primaryFocus);
  const nudge = formatMealGoalNudge(snapshot, hint);
  const summaryWithNudge = appendMealGoalNudge(summary, nudge);

  const actions = ranked.map((row, index) => ({
    id: `meal-rec-${index}`,
    kind: "open" as const,
    label:
      snapshot.primaryFocus === "none"
        ? `${row.item} (${row.score})`
        : `${row.goalTraitLabel ?? row.item} ${row.item}`,
    href: "#",
    payload: {
      recommendationItem: row.item,
      recommendationScore: row.score,
      goalTraitLabel: row.goalTraitLabel,
      goalScoreBonus: row.goalScoreBonus,
    },
  }));

  return {
    ...orchestrator,
    summary: summaryWithNudge,
    actions,
    metadata: {
      ...orchestrator.metadata,
      contextual_recommendation: adjustedRecommendation,
      goal_meal_policy_applied: true,
      goal_primary_focus: snapshot.primaryFocus,
    },
  };
}

/** Full Hook D pass on contextual meal payload. */
export function applyMealGoalPolicyToPayload(
  payload: ContextualMealOrchestratorPayload,
  snapshot: GoalSnapshot | null | undefined,
  hint: GoalPriorityHint | null | undefined,
  clock?: Date,
): ContextualMealOrchestratorPayload {
  if (!snapshot || snapshot.primaryFocus === "none") {
    return payload;
  }

  const recommendation = applyMealGoalPolicyToRecommendation(
    payload.recommendation,
    snapshot,
    hint,
    clock,
  );

  return {
    recommendation,
    orchestrator: applyMealGoalPolicyToOrchestrator(
      payload.orchestrator,
      recommendation,
      snapshot,
      hint,
      clock,
    ),
  };
}
