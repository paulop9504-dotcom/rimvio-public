/** Activity / outing discovery tokens — maps to ACTIVITY_DISCOVERY. */
export const ACTIVITY_KEYWORDS = [
  "놀만한곳",
  "놀만한 데",
  "가볼만한곳",
  "가볼만한 데",
  "갈만한곳",
  "갈만한 데",
  "데이트코스",
  "데이트",
  "놀거리",
  "실내놀거리",
  "실내 놀거리",
  "체험",
  "구경",
  "산책",
  "관광",
  "명소",
  "여행지",
  "아이랑",
  "아이와",
  "가족",
  "주말나들이",
] as const;

const SORTED = [...ACTIVITY_KEYWORDS].sort((a, b) => b.length - a.length);

const FIND_ACTIVITY =
  /(?:놀만한|가볼만한|갈만한)(?:\s*곳|\s*데)?.*(?:추천|찾|알려|골라|해\s*줘)|(?:추천|찾|알려|골라).*(?:놀만한|가볼만한|갈만한|놀거리|데이트|명소|관광)/iu;

const RECOMMEND_GENERIC =
  /(?:어디\s*가\s*좋|뭐\s*할|어디\s*갈|어디\s*놀)/iu;

export function extractActivityKeyword(message: string): string | null {
  const normalized = message.trim();
  for (const term of SORTED) {
    if (normalized.toLowerCase().includes(term.toLowerCase())) {
      return term;
    }
  }
  if (/놀만한/u.test(normalized)) {
    return "놀만한곳";
  }
  if (/가볼만한/u.test(normalized)) {
    return "가볼만한곳";
  }
  if (/갈만한/u.test(normalized)) {
    return "갈만한곳";
  }
  return null;
}

export function isActivityDiscoveryQuery(message: string): boolean {
  const trimmed = message.trim();
  return (
    Boolean(extractActivityKeyword(trimmed)) ||
    FIND_ACTIVITY.test(trimmed) ||
    (RECOMMEND_GENERIC.test(trimmed) && /추천|찾|알려|골라/u.test(trimmed))
  );
}

/** Naver local query label for activity search. */
export function activityNaverSearchLabel(keyword: string | null): string {
  if (!keyword) {
    return "가볼만한곳";
  }
  if (/데이트/u.test(keyword)) {
    return "데이트코스";
  }
  if (/놀거리|실내/u.test(keyword)) {
    return "놀거리";
  }
  if (/관광|명소|여행/u.test(keyword)) {
    return "관광명소";
  }
  return "가볼만한곳";
}

export function isDiscoveryPhrase(text: string): boolean {
  return /(?:추천|놀만|가볼|갈만|맛집|놀거|데이트|명소|관광|어디)/u.test(text);
}
