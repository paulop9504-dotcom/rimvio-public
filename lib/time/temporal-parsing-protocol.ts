export const TEMPORAL_PARSING_PROTOCOL = `# [Temporal Parsing Protocol (Advanced)]

사용자 입력에 **상대적 시간 패턴(숫자 + 일/주/달/년 + 뒤/후/다음)**이 있는지 감지하라.
특정 키워드(1달)만 찾지 말고 **숫자+단위+방향** 구조를 일반화하라.

## 패턴 예시
- "X일 뒤", "X개월 후", "한 달 뒤", "3주 후"
- "X분 뒤/안에", "X시간 뒤/안에" (분·시간 단위 — 절대 ISO로 변환)
- "내년", "다음 주", "다음 주 금요일", "내일", "모레"

## 분류 규칙
- 위 패턴이 감지되면 **검색 키워드가 아니라 [일정 생성/계산] 의도**로 분류.
- LLM이 날짜를 직접 계산하지 마라. GLOBAL_BRAIN_SNAPSHOT.resolved_temporal(YYYY-MM-DD)을 신뢰하라.
- 정규화된 dateKey/iso를 캘린더·알림 툴 매개변수로 명시하라.`;

export const MINUTE_TEMPORAL_PATTERN_RE =
  /(\d{1,3})\s*분\s*(?:뒤|후|뒤에|후에|안에|이내)|(\d{1,2})\s*시간\s*(?:뒤|후|뒤에|후에|안에|이내)/iu;

/** Generalized: number/word + unit + direction — not hardcoded "1달". */
export const TEMPORAL_PATTERN_RE =
  /(?:(?:\d+|한|하루|일|두|세|네|다섯|여섯|일주)\s*(?:일|주|달|개월|년|month|week|day|year)\s*(?:뒤|후|이후|후에|뒤에)|(?:한|일)\s*달\s*(?:뒤|후|이후)|(?:다음\s*(?:주|달|해|년|월)|내년|내일|모레)|(?:in\s+\d+\s+(?:day|week|month|year)s?|next\s+(?:week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)))/iu;

export function detectTemporalPattern(message: string): string | null {
  const minuteMatch = message.match(MINUTE_TEMPORAL_PATTERN_RE);
  if (minuteMatch?.[0]) {
    return minuteMatch[0].trim();
  }
  const match = message.match(TEMPORAL_PATTERN_RE);
  return match?.[0]?.trim() ?? null;
}

export function hasTemporalSchedulePattern(message: string): boolean {
  return detectTemporalPattern(message) !== null;
}
