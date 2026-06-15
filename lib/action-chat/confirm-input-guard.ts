/**
 * CONFIRM-mode input guard — separates system queries from location corrections.
 */

const SYSTEM_QUERY =
  /(?:왜\s*(?:액션|버튼|안)|어떻게\s*(?:해|하)|뭐(?:야|임|ㅇ)|무슨\s*(?:일|뜻)|이상(?:해|하)|안\s*(?:줘|나와|돼|됨|되|뜸|보여|나옴|해줌)|액션\s*(?:안|어디)|버튼\s*(?:안|어디)|어째서|왜\s*그|왜\s*이|안\s*주|안\s*줌|\?{2,})/i;

const PLACE_CORRECTION_SIGNAL =
  /(?:역(?:\s|$|에서|으로|까지)|공항|터미널|특별시|광역시|(?:로|길|번길)\s*\d|(?:동|구)\s+[가-힣]|갤러리아|스타벅스|둔산|역삼|강남|맥도날드|이마트|홈플러스|코스트코|올리브영)/i;

export function looksLikePlaceInput(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  return PLACE_CORRECTION_SIGNAL.test(trimmed);
}

export function isSystemQuery(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }

  if (SYSTEM_QUERY.test(trimmed)) {
    return true;
  }

  if (/[?？]/.test(trimmed) && !looksLikePlaceInput(trimmed)) {
    return true;
  }

  return false;
}

export function buildSystemQueryReply(): string {
  return [
    "아직 장소 확인이 끝나지 않아서 액션 버튼을 보여드리지 못했어요.",
    "아래 카드에서 장소를 확인해 주시면 바로 길찾기·일정 버튼을 띄울게요.",
    "다른 질문을 먼저 하시려면 '취소'라고 말씀해 주세요.",
  ].join(" ");
}
