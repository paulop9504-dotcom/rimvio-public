/**
 * Maps user text to Action Contract ids (registry keys).
 * Heuristic only — does not read or alter kernel decisions.
 */

import { shouldForceDecisionRoute } from "@/lib/action-chat/routing-patches/decision-priority-override";
import { isTikiTakaChoiceReply } from "@/lib/action-chat/tiki-taka-choice-reply";

const MEAL_HINT =
  /(?:맛집|점심|저녁|식사|끼니|브런치|야식|식당\s*추천|메뉴\s*추천|먹(?:을|지|을까)?|배달|시킬까|배고(?:파|프|픈)|(?:먹|맛|식|메뉴|배달|치킨|카페|배고).{0,16}추천|추천.{0,16}(?:먹|맛|식|메뉴|배달|치킨|맛집|카페|배고))/iu;

const PRICE_HINT =
  /(?:가격|요금|비용|얼마|price|cost|메뉴\s*가격)/iu;

const WEATHER_HINT =
  /(?:날씨|weather|기온|강수|미세머지)/iu;

const NAVIGATE_HINT =
  /(?:길\s*찾|길찾기|길찾|가는\s*길|가\s*줘|가자|이동|출발|도착|까지|내비|네비|route|navigate|택시|버스|지하철)/iu;

const SCHEDULE_HINT =
  /(?:일정|스케줄|캘린더).*(?:정리|관리)|일정\s*정리/iu;

export function inferContractAction(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  if (isTikiTakaChoiceReply(trimmed)) {
    return null;
  }

  if (shouldForceDecisionRoute(trimmed)) {
    return null;
  }

  if (MEAL_HINT.test(trimmed)) {
    return "MEAL_RECOMMENDATION";
  }

  if (WEATHER_HINT.test(trimmed)) {
    return "WEATHER";
  }

  if (PRICE_HINT.test(trimmed)) {
    return "PRICE_LOOKUP";
  }

  if (NAVIGATE_HINT.test(trimmed)) {
    return "NAVIGATE";
  }

  if (SCHEDULE_HINT.test(trimmed)) {
    return "SCHEDULE_ORGANIZE";
  }

  return null;
}
