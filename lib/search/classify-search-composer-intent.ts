/** Search tab composer routing — capture ingress · related context search · no generic AI. */

export type SearchComposerIntent =
  | "mention"
  | "capture"
  | "context_search"
  | "generic_ai";

const GENERIC_AI_PATTERN =
  /(?:맛집|식당|메뉴|뭐\s*먹|뭘\s*먹|배고파|저녁|점심|아침|카페\s*추천|길찾기|어떻게\s*가|가는\s*길|가는법|네비|내비|추천해|추천\s*좀|알려줘|어디\s*가|근처|주변)/iu;

const PLANNING_MEMO_PATTERN =
  /(?:여행|일정|약속|만남|메모|제주|오사카|부산|서울|\d{1,2}\s*월|\d{1,2}\s*일|\d+\s*박|N박)/iu;

const NEW_PLAN_SIGNAL =
  /(?:일정\s*잡|일정\s*메모|여행\s*메모|여행\s*계획|계획\s*세|예약|N박\s*\d|\d+\s*박\s*\d|메모\s*남)/iu;

const CONTEXT_RECALL_SIGNAL =
  /(?:추억|경험|지난|작년|예전|그때|갔던|기억|관련|찾아|다시\s*가|이전|방문)/iu;

const EXPLORATORY_PLACE_PEER =
  /(?:제주|오사카|부산|서울|강남|홍대|여행|민수|지연|[가-힣]{2,4}(?:이랑|랑))/iu;

export function looksLikeContextSearch(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("@") || /https?:\/\//iu.test(trimmed)) {
    return false;
  }
  if (NEW_PLAN_SIGNAL.test(trimmed)) {
    return false;
  }
  if (
    PLANNING_MEMO_PATTERN.test(trimmed) &&
    /(?:\d{1,2}\s*시|\d{1,2}:\d{2}|약속|만남|일정|메모)/u.test(trimmed) &&
    !CONTEXT_RECALL_SIGNAL.test(trimmed)
  ) {
    return false;
  }
  if (GENERIC_AI_PATTERN.test(trimmed)) {
    return false;
  }
  if (CONTEXT_RECALL_SIGNAL.test(trimmed)) {
    return true;
  }
  if (
    EXPLORATORY_PLACE_PEER.test(trimmed) &&
    trimmed.length <= 48 &&
    !/(?:일정|메모|계획|약속\s*\d)/u.test(trimmed)
  ) {
    return true;
  }
  return false;
}

export function classifySearchComposerIntent(text: string): SearchComposerIntent {
  const trimmed = text.trim();
  if (!trimmed) {
    return "capture";
  }
  if (trimmed.startsWith("@")) {
    return "mention";
  }
  if (/https?:\/\//iu.test(trimmed)) {
    return "capture";
  }

  if (looksLikeContextSearch(trimmed)) {
    return "context_search";
  }

  const planningMemo = PLANNING_MEMO_PATTERN.test(trimmed);
  if (GENERIC_AI_PATTERN.test(trimmed) && !planningMemo) {
    return "generic_ai";
  }

  return "capture";
}
