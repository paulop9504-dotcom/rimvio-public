import { extractKoreanAreaFromText } from "@/lib/event-commit-gate/parse-korean-area";

export type ResolvedKoreanAreaPhrase = {
  /** 사용자가 말한 핵심 토큰 (예: 대치동) */
  area: string;
  /** 맛집/지도 검색에 넣을 전체 문자열 */
  searchQuery: string;
  dong: string | null;
  gu: string | null;
  si: string | null;
  /** 동 이름만 있고 시·구 맥락이 없을 때 */
  needsBroaderContext: boolean;
};

const SI_TOKEN = /([가-힣]{2,8}(?:특별시|광역시|특별자치시|도|시))/u;
const GU_TOKEN = /([가-힣]{2,8}구)/u;
const DONG_TOKEN = /([가-힣A-Za-z0-9]{2,12}동)/u;
const STATION_TOKEN = /([가-힣A-Za-z0-9]{2,12}역)/u;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function pickDong(message: string): string | null {
  return (
    message.match(DONG_TOKEN)?.[1] ??
    message.match(STATION_TOKEN)?.[1] ??
    extractKoreanAreaFromText(message)
  );
}

/** lifeZone·최근 검색에서 시·구 힌트 추출 (전국 동명 중복 완화) */
export function inferBroaderRegionHint(input: {
  lifeZoneLabel?: string | null;
  recentSearchQueries?: readonly string[];
}): { gu: string | null; si: string | null } {
  const hay = [
    input.lifeZoneLabel ?? "",
    ...(input.recentSearchQueries ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  if (!hay.trim()) {
    return { gu: null, si: null };
  }

  return {
    gu: hay.match(GU_TOKEN)?.[1] ?? null,
    si: hay.match(SI_TOKEN)?.[1] ?? null,
  };
}

/**
 * 동·역·구 파싱 + 맥락 병합.
 * - "강남구 대치동" / "서울 대치동" → 바로 검색 가능
 * - "대치동"만 → lifeZone 있으면 병합, 없으면 needsBroaderContext
 */
export function resolveKoreanAreaPhrase(input: {
  message: string;
  lifeZoneLabel?: string | null;
  recentSearchQueries?: readonly string[];
}): ResolvedKoreanAreaPhrase {
  const trimmed = normalizeWhitespace(input.message);
  const dong = pickDong(trimmed);
  const guFromMsg = trimmed.match(GU_TOKEN)?.[1] ?? null;
  const siFromMsg = trimmed.match(SI_TOKEN)?.[1] ?? null;
  const hint = inferBroaderRegionHint(input);

  const gu = guFromMsg ?? hint.gu;
  const si = siFromMsg ?? hint.si;
  const area = dong ?? extractKoreanAreaFromText(trimmed) ?? trimmed;

  const parts = [si, gu, area].filter(Boolean) as string[];
  const searchQuery = normalizeWhitespace(parts.join(" ")) || `${area} 근처`;

  const needsBroaderContext = Boolean(
    dong &&
      !guFromMsg &&
      !siFromMsg &&
      !hint.gu &&
      !hint.si &&
      !STATION_TOKEN.test(area),
  );

  return {
    area,
    searchQuery,
    dong,
    gu,
    si,
    needsBroaderContext,
  };
}

export function buildDongDisambiguationReply(area: string): string {
  return (
    `**${area}**은 전국에 같은 이름이 여러 곳 있을 수 있어요. ` +
    `**구·시**를 함께 알려주세요. (예: 강남구 ${area}, 수성구 ${area})`
  );
}
