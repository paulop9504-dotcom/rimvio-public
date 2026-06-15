import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { isAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { isTikiTakaChoiceReply } from "@/lib/action-chat/tiki-taka-choice-reply";
import { isContextDriftInput } from "@/lib/action-chat/routing-patches/context-drift-resolver";
import { shouldForceDecisionRoute } from "@/lib/action-chat/routing-patches/decision-priority-override";
import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import {
  isPlaceRecommendationQuery,
  parseFindPlaceIntent,
} from "@/lib/context-resolver/discovery/parse-find-place-intent";

const PLACE_SEARCH_COMMAND =
  /(?:맛집|식당|레스토랑|음식점|카페).*(?:검색|찾기|찾아)|(?:검색|찾기|찾아).*(?:맛집|식당|레스토랑|음식점|카페)/iu;

const BARE_DINING_SEARCH = /^맛집\s*(?:검색|찾기|찾아)/iu;

const RECOMMEND_TAIL = /(?:추천|찾|알려|골라|해\s*줘|해줘)/u;

const DEICTIC_FOLLOWUP =
  /^(?:그거|그\s*거|아까(?:\s*거)?|비슷(?:하게)?|같은\s*거|저\s*거)/iu;

function lastUserPlaceEntity(history: readonly OrchestrateHistoryTurn[]): string | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn.role !== "user") {
      continue;
    }
    const content = turn.content.trim();
    if (!content || PLACE_SEARCH_COMMAND.test(content) || BARE_DINING_SEARCH.test(content)) {
      continue;
    }
    const entity = resolveNavigationPlaceName(content);
    if (entity && entity.length >= 2 && entity.length <= 14) {
      return entity;
    }
  }
  return null;
}

/**
 * Expand short or command-like dining utterances into a parseable discovery query.
 * e.g. "쿠우쿠우" → "쿠우쿠우 맛집 추천"; history "쿠우쿠우" + "맛집 검색좀" → same.
 */
export function enrichPlaceDiscoveryMessage(
  message: string,
  history?: readonly OrchestrateHistoryTurn[]
): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (isTikiTakaChoiceReply(trimmed)) {
    return trimmed;
  }

  if (shouldForceDecisionRoute(trimmed) || isContextDriftInput(trimmed)) {
    return trimmed;
  }

  const priorEntity = history?.length ? lastUserPlaceEntity(history) : null;

  if (DEICTIC_FOLLOWUP.test(trimmed) && history?.length) {
    return trimmed;
  }

  if (PLACE_SEARCH_COMMAND.test(trimmed) || BARE_DINING_SEARCH.test(trimmed)) {
    if (priorEntity) {
      return `${priorEntity} 맛집 추천`;
    }
    return trimmed
      .replace(/검색(?:좀|해줘|해|할까)?/giu, "추천")
      .replace(/찾기|찾아(?:줘|볼까)?/giu, "추천")
      .trim();
  }

  if (priorEntity && /^(?:맛집|식당|추천|검색)/u.test(trimmed)) {
    return `${priorEntity} ${trimmed.includes("맛집") ? trimmed : `맛집 ${trimmed}`}`;
  }

  if (isAiIntentUtterance(trimmed)) {
    return trimmed;
  }

  const brand = resolveNavigationPlaceName(trimmed);
  const isBareBrandOnly =
    brand &&
    !RECOMMEND_TAIL.test(trimmed) &&
    !PLACE_SEARCH_COMMAND.test(trimmed) &&
    !/(?:\d{1,2}\s*시|내일|모레|오늘|역|동|구|로|길|가야|만나)/u.test(trimmed) &&
    trimmed.replace(/\s+/g, "") === brand.replace(/\s+/g, "");

  if (isBareBrandOnly) {
    return `${brand} 맛집 추천`;
  }

  if (isPlaceRecommendationQuery(trimmed)) {
    const parsed = parseFindPlaceIntent(trimmed);
    if (priorEntity && parsed && !parsed.naverQuery.includes(priorEntity)) {
      return `${priorEntity} ${trimmed}`;
    }
    return trimmed;
  }

  if (priorEntity && /^(?:맛집|식당|추천|검색)/u.test(trimmed)) {
    return `${priorEntity} ${trimmed.includes("맛집") ? trimmed : `맛집 ${trimmed}`}`;
  }

  return trimmed;
}

export function looksLikePlaceSearchCommand(message: string): boolean {
  const trimmed = message.trim();
  return PLACE_SEARCH_COMMAND.test(trimmed) || BARE_DINING_SEARCH.test(trimmed);
}
