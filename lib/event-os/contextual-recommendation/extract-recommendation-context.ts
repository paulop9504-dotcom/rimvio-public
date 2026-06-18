import {
  inferMealCategory,
  isHeavyCategory,
} from "@/lib/event-os/contextual-recommendation/meal-category-map";
import type {
  ImplicitGoal,
  MealEventRecord,
  RecommendationContext,
  RecommendationIntent,
  Sentiment,
  TimeOfDay,
} from "@/lib/event-os/contextual-recommendation/recommendation-types";

const FOOD_RECOMMEND_SIGNAL =
  /(?:뭐\s*먹|무엇을\s*먹|메뉴|추천|골라|정해|저녁|점심|아침|야식|식사|끼니|먹을까|먹지|배고|맛집|식당|카페|한끼|먹고\s*싶|근처)/u;

const LAST_MEAL_PATTERNS = [
  /어제\s+(.+?)\s+(?:먹|드셨|먹었)/u,
  /방금\s+(.+?)\s+(?:먹|먹었)/u,
  /(?:점심|아침|저녁)(?:에|으로)?\s+(.+?)\s+(?:먹|먹었)/u,
  /(.+?)\s+(?:먹었는데|먹었어|먹었음)/u,
];

const TIME_OF_DAY_RULES: Array<{ pattern: RegExp; value: TimeOfDay }> = [
  { pattern: /(?:아침|브런치|morning)/iu, value: "breakfast" },
  { pattern: /(?:점심|lunch)/iu, value: "lunch" },
  { pattern: /(?:저녁|밤|dinner)/iu, value: "dinner" },
  { pattern: /(?:야식|간식|snack)/iu, value: "snack" },
];

function inferTimeOfDay(message: string, clock: Date): TimeOfDay {
  for (const rule of TIME_OF_DAY_RULES) {
    if (rule.pattern.test(message)) {
      return rule.value;
    }
  }
  const hour = clock.getHours();
  if (hour >= 5 && hour < 11) {
    return "breakfast";
  }
  if (hour >= 11 && hour < 15) {
    return "lunch";
  }
  if (hour >= 17 && hour < 22) {
    return "dinner";
  }
  if (hour >= 22 || hour < 5) {
    return "snack";
  }
  return "unknown";
}

function inferSentiment(message: string): Sentiment {
  if (/(?:별로|질림|물림|부담|무거|기름)/u.test(message)) {
    return "negative";
  }
  if (/(?:좋아|맛있|기분\s*좋|달콤|시원)/u.test(message)) {
    return "positive";
  }
  return "neutral";
}

function extractLastMealFromText(message: string): string | null {
  for (const pattern of LAST_MEAL_PATTERNS) {
    const match = message.match(pattern);
    const captured = match?.[1]?.trim();
    if (captured && captured.length >= 2 && captured.length <= 24) {
      return captured.replace(/[은는이가을를]$/, "").trim();
    }
  }
  return null;
}

function latestMealFromHistory(
  history: MealEventRecord[] | undefined
): MealEventRecord | null {
  if (!history?.length) {
    return null;
  }
  return history[history.length - 1] ?? null;
}

function deriveImplicitGoals(input: {
  message: string;
  lastMeal: string | null;
  lastCategory: string | null;
  sentiment: Sentiment;
}): ImplicitGoal[] {
  const goals = new Set<ImplicitGoal>();

  if (input.lastMeal || /어제|방금|또|같은|비슷한/u.test(input.message)) {
    goals.add("avoid_repetition");
    goals.add("variety");
  }

  if (
    input.sentiment === "negative" ||
    isHeavyCategory(input.lastCategory as never) ||
    /가볍|담백|건강|부담|무거/u.test(input.message)
  ) {
    goals.add("balance");
    goals.add("light_meal");
  } else if (input.lastMeal) {
    goals.add("balance");
  }

  if (/다양|바꿔|다른|새로운/u.test(input.message)) {
    goals.add("variety");
  }

  if (goals.size === 0 && FOOD_RECOMMEND_SIGNAL.test(input.message)) {
    goals.add("variety");
    goals.add("balance");
  }

  return [...goals];
}

/**
 * Structured context extraction — composes signals, not single-keyword routing.
 */
export function extractRecommendationContext(input: {
  message: string;
  eventHistory?: MealEventRecord[];
  clock?: Date;
}): RecommendationContext {
  const message = input.message.trim();
  const clock = input.clock ?? new Date();

  const intent: RecommendationIntent = FOOD_RECOMMEND_SIGNAL.test(message)
    ? "FOOD_RECOMMENDATION"
    : "UNKNOWN";

  let lastMeal = extractLastMealFromText(message);
  let lastMealCategory = lastMeal ? inferMealCategory(lastMeal) : null;

  const historyMeal = latestMealFromHistory(input.eventHistory);
  if (!lastMeal && historyMeal) {
    lastMeal = historyMeal.label;
    lastMealCategory =
      (historyMeal.category as RecommendationContext["lastMealCategory"]) ??
      inferMealCategory(historyMeal.label);
  }

  const timeOfDay =
    historyMeal?.timeOfDay ?? inferTimeOfDay(message, clock);
  const sentiment = inferSentiment(message);
  const implicitGoal = deriveImplicitGoals({
    message,
    lastMeal,
    lastCategory: lastMealCategory,
    sentiment,
  });

  return {
    intent,
    lastMeal,
    lastMealCategory,
    timeOfDay,
    sentiment,
    implicitGoal,
  };
}
