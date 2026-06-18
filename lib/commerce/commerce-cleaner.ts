/** Noise terms in cross-platform search titles — filter before price stats. */
export const SECONDHAND_BLACKLIST = [
  "케이스",
  "필름",
  "강화유리",
  "공박스",
  "박스만",
  "매입",
  "삽니다",
  "구합니다",
  "교환",
  "부품",
  "호환",
  "리퍼",
  "데모",
  "파손",
  "고장",
  "증정",
  "사은품",
] as const;

const SECONDHAND_DOMAIN_PATTERN =
  /joongna|junggo|bunjang|daangn|karrotmarket|karrot|mercari|fril\.jp|rakuma|poshmark|depop|facebook\.com\/marketplace/i;

const SECONDHAND_TITLE_PATTERN =
  /중고|직거래|급처|네고|판매|팝니다|미개봉|풀박|s급|a급|b급/i;

export function isSecondhandDomain(domain: string | null | undefined) {
  if (!domain?.trim()) {
    return false;
  }

  return SECONDHAND_DOMAIN_PATTERN.test(domain.trim().toLowerCase());
}

export function looksLikeSecondhandTitle(title: string | null | undefined) {
  if (!title?.trim()) {
    return false;
  }

  return SECONDHAND_TITLE_PATTERN.test(title);
}

/** Strip marketplace fluff from listing titles for compare search queries. */
export function normalizeSecondhandTitle(rawTitle: string): string {
  let clean = rawTitle.trim();

  clean = clean.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, " ");
  clean = clean.replace(
    /팝니다|판매합니다|판매|미개봉|급처|풀박스|풀박|새상품|거의새것|상태\s*[sabc][+-]?급?/gi,
    " "
  );
  clean = clean.replace(/\d{1,3}(?:,\d{3})+\s*원|\d+\s*원|₩\s*\d+/g, " ");
  clean = clean.replace(/\s+/g, " ").trim();

  return clean.length >= 2 ? clean : rawTitle.trim();
}

export function passesSecondhandBlacklist(title: string) {
  const normalized = title.trim().toLowerCase();
  return !SECONDHAND_BLACKLIST.some((word) => normalized.includes(word.toLowerCase()));
}

export function stripHtmlTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
