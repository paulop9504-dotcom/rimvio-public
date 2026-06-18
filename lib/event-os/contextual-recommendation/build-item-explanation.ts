import type {
  FoodCandidate,
  ItemExplanationTrace,
  RecommendationConstraints,
  RecommendationContext,
  ScoreBreakdown,
} from "@/lib/event-os/contextual-recommendation/recommendation-types";

export function buildItemExplanation(input: {
  candidate: FoodCandidate;
  context: RecommendationContext;
  constraints: RecommendationConstraints;
  breakdown: ScoreBreakdown;
}): ItemExplanationTrace {
  const lines: ItemExplanationTrace["lines"] = [];

  if (input.context.lastMeal && input.constraints.avoidSameCategory) {
    lines.push({
      constraint: "avoidSameCategory",
      rationale:
        input.candidate.category === input.context.lastMealCategory
          ? `lastMeal = ${input.context.lastMeal} → same category (penalized)`
          : `lastMeal = ${input.context.lastMeal} → different category`,
    });
  }

  if (input.constraints.reduceHeavyFood) {
    lines.push({
      constraint: "reduceHeavyFood",
      rationale: input.candidate.warmSoup
        ? "heavy food balance needed → warm soup 계열"
        : `heaviness ${input.candidate.heaviness.toFixed(2)} → lighter option`,
    });
  }

  if (input.constraints.increaseVarietyScore) {
    lines.push({
      constraint: "increaseVarietyScore",
      rationale: `variety score contribution = ${input.breakdown.diversity} (diversity axis)`,
    });
  }

  if (input.constraints.preferBalancedNutrition) {
    lines.push({
      constraint: "preferBalancedNutrition",
      rationale: `nutrition balance axis = ${input.breakdown.healthBalance}`,
    });
  }

  if (input.context.timeOfDay !== "unknown") {
    lines.push({
      constraint: "timeOfDay",
      rationale: `timeOfDay = ${input.context.timeOfDay} → contextMatch ${input.breakdown.contextMatch}`,
    });
  }

  if (lines.length === 0) {
    lines.push({
      constraint: "baseline",
      rationale: "constraint-driven scoring applied with neutral context",
    });
  }

  return {
    item: input.candidate.item,
    lines,
  };
}
