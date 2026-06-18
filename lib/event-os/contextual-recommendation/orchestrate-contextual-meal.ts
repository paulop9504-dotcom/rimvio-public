import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { applyMealGoalPolicyToPayload } from "@/lib/goal-engine/apply-meal-goal-policy";
import type {
  GoalPriorityHint,
  GoalSnapshot,
} from "@/lib/goal-engine/types";
import {
  formatExplanationBlock,
  formatRecommendationSummary,
} from "@/lib/event-os/contextual-recommendation/format-recommendation-output";
import { mealHistoryFromChatHistory } from "@/lib/event-os/contextual-recommendation/meal-history-from-chat";
import { recommendFromContext } from "@/lib/event-os/contextual-recommendation/recommend-from-context";
import type { RecommendationResult } from "@/lib/event-os/contextual-recommendation/recommendation-types";

export type ContextualMealOrchestratorPayload = {
  recommendation: RecommendationResult;
  orchestrator: OrchestratorResult;
};

/**
 * Event OS meal path — constraint-based menu ranking before optional place discovery.
 */
export function orchestrateContextualMealRecommendation(input: {
  message: string;
  history?: Array<{ role?: string; content?: string }>;
  clock?: Date;
  /** Hook D — pipeline-authored snapshot; do not rebuild here. */
  goalSnapshot?: GoalSnapshot | null;
  goalPriorityHint?: GoalPriorityHint | null;
}): ContextualMealOrchestratorPayload | null {
  const trimmed = input.message.trim();
  if (!trimmed) {
    return null;
  }

  let recommendation: RecommendationResult;
  try {
    recommendation = recommendFromContext({
      message: trimmed,
      eventHistory: mealHistoryFromChatHistory(input.history),
      clock: input.clock,
      topN: 3,
    });
  } catch {
    return null;
  }

  if (recommendation.intent !== "FOOD_RECOMMENDATION") {
    return null;
  }

  const summary = formatRecommendationSummary(recommendation);
  const explanation = formatExplanationBlock(recommendation);

  const orchestrator: OrchestratorResult = {
    summary,
    actions: recommendation.rankedCandidates.map((row, index) => ({
      id: `meal-rec-${index}`,
      kind: "open" as const,
      label: `${row.item} (${row.score})`,
      href: "#",
      payload: {
        recommendationItem: row.item,
        recommendationScore: row.score,
      },
    })),
    source: "rules",
    confidence: 0.92,
    metadata: {
      intent: "ACTION",
      trust_level_adjustment: "NONE",
      contextual_recommendation: recommendation,
      recommendation_explanation: explanation,
    },
    meta: {
      intent_type: "CONTINUE",
      requires_context_switch: false,
      execution_route: "CONTEXTUAL_MEAL_RECOMMENDATION",
      contextual_meal_engine: {
        intent: recommendation.intent,
        constraints: recommendation.constraints,
        topScore: recommendation.rankedCandidates[0]?.score ?? 0,
      },
    },
  };

  const payload: ContextualMealOrchestratorPayload = { recommendation, orchestrator };

  if (input.goalSnapshot?.primaryFocus && input.goalSnapshot.primaryFocus !== "none") {
    return applyMealGoalPolicyToPayload(
      payload,
      input.goalSnapshot,
      input.goalPriorityHint,
      input.clock,
    );
  }

  return payload;
}
