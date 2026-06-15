export type RecommendationIntent = "FOOD_RECOMMENDATION" | "UNKNOWN";

export type TimeOfDay = "breakfast" | "lunch" | "dinner" | "snack" | "unknown";

export type Sentiment = "positive" | "negative" | "neutral";

export type ImplicitGoal =
  | "variety"
  | "balance"
  | "avoid_repetition"
  | "light_meal"
  | "comfort";

export type RecommendationContext = {
  intent: RecommendationIntent;
  lastMeal: string | null;
  lastMealCategory: string | null;
  timeOfDay: TimeOfDay;
  sentiment: Sentiment;
  implicitGoal: ImplicitGoal[];
};

export type RecommendationConstraints = {
  avoidSameCategory: boolean;
  reduceHeavyFood: boolean;
  increaseVarietyScore: boolean;
  preferBalancedNutrition: boolean;
};

export type FoodCategory =
  | "burger"
  | "korean_soup"
  | "korean_main"
  | "poke"
  | "salad"
  | "noodle"
  | "pasta"
  | "fried";

export type FoodCandidate = {
  item: string;
  category: FoodCategory;
  heaviness: number;
  nutritionBalance: number;
  satisfactionBase: number;
  warmSoup: boolean;
};

export type ScoreBreakdown = {
  diversity: number;
  healthBalance: number;
  satisfaction: number;
  contextMatch: number;
  total: number;
};

export type RankedCandidate = {
  item: string;
  score: number;
  breakdown: ScoreBreakdown;
};

export type ExplanationLine = {
  constraint: string;
  rationale: string;
};

export type ItemExplanationTrace = {
  item: string;
  lines: ExplanationLine[];
};

export type RecommendationInput = {
  message: string;
  eventHistory?: MealEventRecord[];
  clock?: Date;
  topN?: number;
};

export type MealEventRecord = {
  label: string;
  category?: FoodCategory | string;
  timeOfDay?: TimeOfDay;
  occurredAt?: string;
};

export type RecommendationResult = {
  intent: RecommendationIntent;
  context: RecommendationContext;
  constraints: RecommendationConstraints;
  candidates: FoodCandidate[];
  rankedCandidates: RankedCandidate[];
  explanationTrace: ItemExplanationTrace[];
  decisionRationale: string;
};
