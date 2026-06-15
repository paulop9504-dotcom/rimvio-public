import { buildRecommendationConstraints } from "@/lib/event-os/contextual-recommendation/build-recommendation-constraints";
import { extractRecommendationContext } from "@/lib/event-os/contextual-recommendation/extract-recommendation-context";
import { generateFoodCandidates } from "@/lib/event-os/contextual-recommendation/food-catalog";
import { rankFoodCandidates } from "@/lib/event-os/contextual-recommendation/rank-recommendations";
import type {
  RecommendationInput,
  RecommendationResult,
} from "@/lib/event-os/contextual-recommendation/recommendation-types";
import { validateRecommendationResult } from "@/lib/event-os/contextual-recommendation/validate-recommendation-result";

function buildDecisionRationale(
  result: Omit<RecommendationResult, "decisionRationale">
): string {
  const top = result.rankedCandidates[0];
  if (!top) {
    return "No candidates ranked under active constraints.";
  }

  const active = Object.entries(result.constraints)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(", ");

  return [
    `Intent ${result.context.intent} with goals [${result.context.implicitGoal.join(", ")}].`,
    `Active constraints: ${active}.`,
    `Top pick ${top.item} (score ${top.score}) from constraint-weighted axes, not keyword match.`,
  ].join(" ");
}

/**
 * Contextual Recommendation Engine — decision compressor on Event OS.
 * Natural language + optional history → constraints → score → rank → explain.
 */
export function recommendFromContext(
  input: RecommendationInput
): RecommendationResult {
  const context = extractRecommendationContext({
    message: input.message,
    eventHistory: input.eventHistory,
    clock: input.clock,
  });

  const constraints = buildRecommendationConstraints(context);
  const candidates = generateFoodCandidates();
  const { ranked, explanations } = rankFoodCandidates({
    candidates,
    context,
    constraints,
    topN: input.topN ?? 3,
  });

  const partial: Omit<RecommendationResult, "decisionRationale"> = {
    intent: context.intent,
    context,
    constraints,
    candidates,
    rankedCandidates: ranked,
    explanationTrace: explanations,
  };

  const result: RecommendationResult = {
    ...partial,
    decisionRationale: buildDecisionRationale(partial),
  };

  const failures = validateRecommendationResult(input, result);
  if (failures.length > 0) {
    throw new Error(
      `RecommendationResult validation failed: ${failures.join(", ")}`
    );
  }

  return result;
}
