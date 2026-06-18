import type {
  FoodCandidate,
  RecommendationConstraints,
  RecommendationContext,
  ScoreBreakdown,
} from "@/lib/event-os/contextual-recommendation/recommendation-types";

const MAX = {
  diversity: 30,
  healthBalance: 25,
  satisfaction: 25,
  contextMatch: 20,
} as const;

function clampScore(value: number, max: number): number {
  return Math.round(Math.min(max, Math.max(0, value)));
}

function scoreDiversity(
  candidate: FoodCandidate,
  context: RecommendationContext,
  constraints: RecommendationConstraints
): number {
  if (!constraints.increaseVarietyScore && !constraints.avoidSameCategory) {
    return MAX.diversity * 0.5;
  }

  let score = 10;
  if (
    constraints.avoidSameCategory &&
    context.lastMealCategory &&
    candidate.category !== context.lastMealCategory
  ) {
    score += 18;
  } else if (
    constraints.avoidSameCategory &&
    context.lastMealCategory === candidate.category
  ) {
    score += 2;
  }

  if (constraints.increaseVarietyScore) {
    score += candidate.category === "poke" || candidate.category === "salad" ? 6 : 4;
  }

  return clampScore(score, MAX.diversity);
}

function scoreHealthBalance(
  candidate: FoodCandidate,
  constraints: RecommendationConstraints
): number {
  let score = candidate.nutritionBalance * MAX.healthBalance;

  if (constraints.reduceHeavyFood) {
    const lightBonus = (1 - candidate.heaviness) * 12;
    score += lightBonus;
  }

  if (constraints.preferBalancedNutrition) {
    score += candidate.nutritionBalance * 6;
  }

  return clampScore(score, MAX.healthBalance);
}

function scoreSatisfaction(
  candidate: FoodCandidate,
  context: RecommendationContext
): number {
  let score = candidate.satisfactionBase * MAX.satisfaction;

  if (context.sentiment === "negative") {
    score += candidate.nutritionBalance * 4;
  }
  if (context.implicitGoal.includes("comfort") && candidate.warmSoup) {
    score += 4;
  }

  return clampScore(score, MAX.satisfaction);
}

function scoreContextMatch(
  candidate: FoodCandidate,
  context: RecommendationContext,
  constraints: RecommendationConstraints
): number {
  let score = 8;

  if (context.timeOfDay === "dinner" && candidate.warmSoup) {
    score += 6;
  }
  if (context.timeOfDay === "lunch" && candidate.heaviness <= 0.5) {
    score += 4;
  }
  if (context.timeOfDay === "breakfast" && candidate.category === "salad") {
    score += 5;
  }
  if (constraints.reduceHeavyFood && candidate.heaviness <= 0.35) {
    score += 5;
  }
  if (
    context.lastMeal &&
    constraints.avoidSameCategory &&
    candidate.category !== context.lastMealCategory
  ) {
    score += 4;
  }

  return clampScore(score, MAX.contextMatch);
}

export function scoreFoodCandidate(input: {
  candidate: FoodCandidate;
  context: RecommendationContext;
  constraints: RecommendationConstraints;
}): ScoreBreakdown {
  const diversity = scoreDiversity(
    input.candidate,
    input.context,
    input.constraints
  );
  const healthBalance = scoreHealthBalance(
    input.candidate,
    input.constraints
  );
  const satisfaction = scoreSatisfaction(input.candidate, input.context);
  const contextMatch = scoreContextMatch(
    input.candidate,
    input.context,
    input.constraints
  );

  return {
    diversity,
    healthBalance,
    satisfaction,
    contextMatch,
    total: diversity + healthBalance + satisfaction + contextMatch,
  };
}
