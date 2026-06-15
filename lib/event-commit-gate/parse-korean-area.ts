/** 동·역·구 등 한국 지명 토큰 — ML 학습 없이 규칙으로 슬롯 채우기 */

const KOREAN_AREA_TOKEN =
  /^[가-힣A-Za-z0-9][가-힣A-Za-z0-9·\s]{0,14}(?:동|역|구|시|읍|면|리)(?:\s*\d+가)?\.?$/u;

const KOREAN_AREA_IN_TEXT =
  /([가-힣A-Za-z0-9]{2,14}(?:동|역|구|시|읍|면|리))/u;

export function isKoreanAreaToken(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 20) {
    return false;
  }
  if (/^(?:지역|메뉴|분위기)/u.test(trimmed)) {
    return false;
  }
  return KOREAN_AREA_TOKEN.test(trimmed);
}

export function extractKoreanAreaFromText(message: string): string | null {
  const trimmed = message.trim();
  if (isKoreanAreaToken(trimmed)) {
    return trimmed.replace(/\.$/, "");
  }
  const match = trimmed.match(KOREAN_AREA_IN_TEXT);
  return match?.[1] ?? null;
}
