import type { ActionType, ServiceCategory, UrgencyLevel } from "@/lib/korean-service-router/types";

export type CategoryIntentRule = {
  category: ServiceCategory;
  patterns: RegExp;
  defaultServiceId: string;
  actionType: ActionType;
  intentLabel: string;
  urgency: UrgencyLevel;
};

/** Ambiguous category → default service (single action convergence). */
export const CATEGORY_INTENT_RULES: readonly CategoryIntentRule[] = [
  {
    category: "food",
    patterns:
      /(?:배고|먹고\s*싶|배달|주문|야식|치킨\s*시|점심\s*뭐|저녁\s*뭐|라면\s*시|음식\s*시)/u,
    defaultServiceId: "baemin",
    actionType: "ORDER",
    intentLabel: "food_order",
    urgency: "HIGH",
  },
  {
    category: "shopping",
    patterns: /(?:쇼핑|사고\s*싶|구매|장\s*봐|마트|택배\s*시)/u,
    defaultServiceId: "coupang",
    actionType: "ORDER",
    intentLabel: "shopping_purchase",
    urgency: "MID",
  },
  {
    category: "productivity",
    patterns: /(?:일정\s*잡|캘린더|미팅\s*잡|약속\s*잡|리마인|할\s*일)/u,
    defaultServiceId: "google-calendar",
    actionType: "BOOK",
    intentLabel: "schedule_book",
    urgency: "HIGH",
  },
  {
    category: "finance",
    patterns: /(?:송금|이체|돈\s*보내|잔액|통장|투자|주식)/u,
    defaultServiceId: "toss",
    actionType: "ORDER",
    intentLabel: "finance_execute",
    urgency: "HIGH",
  },
  {
    category: "health",
    patterns: /(?:병원\s*예약|진료|증상|약\s*사|건강\s*검진)/u,
    defaultServiceId: "goodoc",
    actionType: "BOOK",
    intentLabel: "health_book",
    urgency: "HIGH",
  },
  {
    category: "education",
    patterns: /(?:공부|수능|강의|코딩\s*배|자격증\s*준)/u,
    defaultServiceId: "inflearn",
    actionType: "LEARN",
    intentLabel: "education_learn",
    urgency: "MID",
  },
  {
    category: "life",
    patterns: /(?:원룸|전세|월세|부동산|숙소\s*예|호텔\s*예)/u,
    defaultServiceId: "zigbang",
    actionType: "SEARCH",
    intentLabel: "housing_search",
    urgency: "MID",
  },
  {
    category: "entertainment",
    patterns: /(?:영화\s*보|드라마\s*보|유튜브\s*틀|노래\s*틀|넷플)/u,
    defaultServiceId: "youtube",
    actionType: "SEARCH",
    intentLabel: "media_watch",
    urgency: "MID",
  },
  {
    category: "career",
    patterns: /(?:취업|이직|채용|구인|이력서|포트폴리오)/u,
    defaultServiceId: "wanted",
    actionType: "SEARCH",
    intentLabel: "career_search",
    urgency: "MID",
  },
  {
    category: "search",
    patterns: /(?:검색\s*해|찾아\s*봐|뉴스\s*봐|정보\s*알)/u,
    defaultServiceId: "naver",
    actionType: "SEARCH",
    intentLabel: "web_search",
    urgency: "LOW",
  },
];

/** Place discovery owns localized meal search — defer web router. */
export function shouldDeferToPlaceDiscovery(message: string): boolean {
  return /(?:맛집|식당|카페|둔산|역\s*근처|동\s*근처|near|주변)/u.test(message);
}
