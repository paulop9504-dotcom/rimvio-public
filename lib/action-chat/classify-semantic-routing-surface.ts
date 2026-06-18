/**
 * Semantic routing — context-aware surface resolution.
 * INFO is never the default when domain signals action/choice/plan/food.
 */

export type RoutingSurface =
  | "INFO"
  | "STEP"
  | "FORK"
  | "DECISION"
  | "REFLECT"
  | "ARTIFACT";

export type SemanticDomain =
  | "food"
  | "housing"
  | "travel"
  | "schedule"
  | "emotion"
  | "tech"
  | "comparison"
  | "ambiguous"
  | "general";

export type SemanticRoutingAnalysis = {
  domain: SemanticDomain;
  expected: readonly RoutingSurface[];
  /** When true, routing to INFO is a critical failure. */
  forbidInfo: boolean;
  multiIntent: boolean;
  reason: string;
};

const FOOD_SEMANTIC =
  /(?:먹|맛집|배달|음식|식당|메뉴|치킨|카페|브런치|점심|저녁|아침|시킬|뭐\s*먹|배고(?:파|프|픈))/iu;

const HOUSING_SEMANTIC =
  /(?:원룸|월세|전세|부동산|살(?:아|기|까|면)|동네|지역|아파트|집\s*구|이사)/iu;

const TRAVEL_SEMANTIC =
  /(?:여행(?:간|감|가|을)?|여행지|관광|코스|일정\s*짜|trip|출장|해외)/iu;

const TRAVEL_DEST_SEMANTIC =
  /(?:오사카|제주|도쿄|후쿠오카|삿포로|교토|방콕|파리|뉴욕|인천공항|김포공항)/iu;

const TIMED_TRAVEL =
  /(?:\d{1,3}\s*시간\s*(?:뒤|후)|\d{1,3}\s*분\s*(?:뒤|후)|내일|모레)/iu;

const SCHEDULE_SEMANTIC =
  /(?:일정|스케줄|계획|약속|캘린더|내일|모레)/iu;

const EMOTION_SEMANTIC =
  /(?:힘든?|스트레스|잘\s*하고|고민|불안|우울|맞(?:아|을)?(?:\?|까)|어떡하지)/iu;

const DECISION_SEMANTIC =
  /(?:\bvs\b|사도\s*돼|뭐가\s*(?:더\s*)?(?:좋|나)|추천|괜찮(?:아|을)?|어디(?:가|서)|선택|고르)/iu;

const TECH_SEMANTIC = /(?:\bAI\b|GPT|클로드|어떻게\s*써|모델\s*차이|작동)/iu;

const INFO_SHAPE =
  /(?:뭐(?:야|임|인|뜻)|설명|차이|쉽게\s*설명|예시|what\s*is|왜\s*(?:이|그|이런|그런)|어떻게\s*되는)/iu;

const MULTI_INTENT =
  /(?:\+|그리고|도\s*짜|도\s*알|랑|하고\s*일정|맛집.*일정|일정.*맛집|데이트\s*코스)/iu;

const DELIVERY_CONTEXT = /(?:배달|음식\s*상황|시킨\s*거|주문)/iu;

/** Semantic ground truth — NOT keyword-only INFO trap. */
export function analyzeSemanticRouting(message: string): SemanticRoutingAnalysis {
  const trimmed = message.trim();
  const multiIntent = MULTI_INTENT.test(trimmed);

  const hasFood = FOOD_SEMANTIC.test(trimmed);
  const hasHousing = HOUSING_SEMANTIC.test(trimmed);
  const hasTravel =
    TRAVEL_SEMANTIC.test(trimmed) ||
    TRAVEL_DEST_SEMANTIC.test(trimmed) ||
    (TIMED_TRAVEL.test(trimmed) && /(?:여행|출장|오사카|제주|도쿄|공항)/iu.test(trimmed));
  const hasSchedule = SCHEDULE_SEMANTIC.test(trimmed);
  const hasEmotion = EMOTION_SEMANTIC.test(trimmed);
  const hasDecision = DECISION_SEMANTIC.test(trimmed);
  const hasTech = TECH_SEMANTIC.test(trimmed);
  const hasInfoShape = INFO_SHAPE.test(trimmed);
  const hasDelivery = DELIVERY_CONTEXT.test(trimmed);

  if (multiIntent && (hasFood || hasTravel || hasSchedule)) {
    return {
      domain: hasFood ? "food" : hasTravel ? "travel" : "schedule",
      expected: ["FORK", "STEP", "DECISION"],
      forbidInfo: true,
      multiIntent: true,
      reason: "multi_intent_primary_split",
    };
  }

  if (hasFood || (hasInfoShape && hasDelivery)) {
    return {
      domain: "food",
      expected: ["FORK", "STEP"],
      forbidInfo: true,
      multiIntent: false,
      reason: "food_domain_overrides_info_shape",
    };
  }

  if (hasFood) {
    return {
      domain: "food",
      expected: ["FORK", "STEP"],
      forbidInfo: true,
      multiIntent: false,
      reason: "food_domain",
    };
  }

  if (hasHousing || (hasDecision && /(?:살|동네|지역|원룸|어디)/iu.test(trimmed))) {
    return {
      domain: "housing",
      expected: ["DECISION", "STEP", "FORK"],
      forbidInfo: true,
      multiIntent: false,
      reason: "housing_or_location_decision",
    };
  }

  if (hasSchedule && (hasInfoShape || /뭐(?:야|임)/iu.test(trimmed))) {
    return {
      domain: "schedule",
      expected: ["STEP", "FORK", "DECISION"],
      forbidInfo: true,
      multiIntent: false,
      reason: "schedule_info_trap",
    };
  }

  if (hasTravel && (TIMED_TRAVEL.test(trimmed) || TRAVEL_DEST_SEMANTIC.test(trimmed) || /여행(?:간|감|가)/iu.test(trimmed))) {
    return {
      domain: "travel",
      expected: ["STEP", "FORK"],
      forbidInfo: true,
      multiIntent: false,
      reason: "travel_trip_announcement",
    };
  }

  if (hasTravel && /(?:어떻게|계획|알려)/iu.test(trimmed)) {
    return {
      domain: "travel",
      expected: ["STEP", "FORK", "DECISION"],
      forbidInfo: true,
      multiIntent: false,
      reason: "travel_planning",
    };
  }

  if (hasEmotion && (hasInfoShape || hasDecision || /뭐(?:야|임)/iu.test(trimmed))) {
    return {
      domain: "emotion",
      expected: ["REFLECT", "DECISION"],
      forbidInfo: true,
      multiIntent: false,
      reason: "emotion_overrides_info",
    };
  }

  if (hasDecision || /(?:vs|사도|괜찮|위험)/iu.test(trimmed)) {
    return {
      domain: "comparison",
      expected: ["DECISION", "STEP"],
      forbidInfo: true,
      multiIntent: false,
      reason: "explicit_decision",
    };
  }

  if (hasTech || /미래\s*어떻/u.test(trimmed)) {
    return {
      domain: "tech",
      expected: ["INFO", "STEP"],
      forbidInfo: false,
      multiIntent: false,
      reason: "tech_hybrid",
    };
  }

  if (/^(?:뭐\s*먹지|어디\s*가지|어떡(?:해|하지)|뭐하지|추천)$/iu.test(trimmed)) {
    const domain: SemanticDomain = /먹/u.test(trimmed)
      ? "food"
      : /추천/u.test(trimmed)
        ? "comparison"
        : /어떡/u.test(trimmed)
          ? "emotion"
          : "general";
    return {
      domain,
      expected:
        domain === "food"
          ? ["FORK", "REFLECT"]
          : domain === "comparison"
            ? ["DECISION", "FORK"]
            : ["FORK", "REFLECT", "DECISION"],
      forbidInfo: true,
      multiIntent: false,
      reason: "minimal_ambiguous",
    };
  }

  if (hasInfoShape && (hasDecision || hasFood || hasSchedule || hasHousing)) {
    return {
      domain: "general",
      expected: ["DECISION", "STEP", "FORK", "REFLECT"],
      forbidInfo: true,
      multiIntent: false,
      reason: "contextual_info_override",
    };
  }

  if (hasInfoShape || hasTech) {
    return {
      domain: hasTech ? "tech" : "general",
      expected: ["INFO", "STEP"],
      forbidInfo: false,
      multiIntent: false,
      reason: "genuine_info",
    };
  }

  return {
    domain: "ambiguous",
    expected: ["FORK", "REFLECT", "DECISION", "STEP"],
    forbidInfo: true,
    multiIntent: false,
    reason: "ambiguous_fallback",
  };
}

/** Critical INFO misroute signatures — instant FAIL. */
export function isCriticalInfoMisroute(
  message: string,
  actual: RoutingSurface
): string | null {
  if (actual !== "INFO") {
    return null;
  }
  const hay = message.toLowerCase();
  if (/맛집|뭐\s*먹|먹을/u.test(hay)) {
    return "CRITICAL: food → INFO";
  }
  if (/원룸|월세|전세/u.test(hay)) {
    return "CRITICAL: housing → INFO";
  }
  if (/\bvs\b|a vs b/u.test(hay)) {
    return "CRITICAL: comparison → INFO";
  }
  if (/^뭐\s*먹지/u.test(message.trim())) {
    return "CRITICAL: minimal food → INFO";
  }
  if (/사도\s*돼|괜찮(?:아|을)?/u.test(hay) && !/ai|gpt/u.test(hay)) {
    return "CRITICAL: decision → INFO";
  }
  if (/잘\s*하고|힘든/u.test(hay)) {
    return "CRITICAL: emotion → INFO";
  }
  return null;
}

export function semanticRoutingMatches(
  actual: RoutingSurface,
  analysis: SemanticRoutingAnalysis
): boolean {
  if (analysis.forbidInfo && actual === "INFO") {
    return false;
  }
  return analysis.expected.includes(actual);
}
