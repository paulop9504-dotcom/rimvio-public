import { isHeavyCategory } from "@/lib/event-os/contextual-recommendation/meal-category-map";
import type {
  RecommendationConstraints,
  RecommendationContext,
} from "@/lib/event-os/contextual-recommendation/recommendation-types";

/** Context → decision constraints (required before any ranking). */
export function buildRecommendationConstraints(
  context: RecommendationContext
): RecommendationConstraints {
  const lastHeavy = isHeavyCategory(
    context.lastMealCategory as never
  );

  return {
    avoidSameCategory: Boolean(context.lastMealCategory),
    reduceHeavyFood:
      lastHeavy ||
      context.sentiment === "negative" ||
      context.implicitGoal.includes("light_meal"),
    increaseVarietyScore:
      context.implicitGoal.includes("variety") ||
      context.implicitGoal.includes("avoid_repetition") ||
      Boolean(context.lastMeal),
    preferBalancedNutrition:
      context.implicitGoal.includes("balance") ||
      context.implicitGoal.includes("light_meal") ||
      lastHeavy,
  };
}

export function constraintsAreActive(
  constraints: RecommendationConstraints
): boolean {
  return Object.values(constraints).some(Boolean);
}
