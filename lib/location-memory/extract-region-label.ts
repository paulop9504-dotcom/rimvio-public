const REGION_TOKEN =
  /([가-힣]{2,8}(?:특별시|광역시|특별자치시|특별자치도|시|군|구|동))/u;

const CITY_SHORT = /(유성|둔산|강남|역삼|홍대|신촌|수서|판교|해운대|제주|대전|서울|부산)/u;

/** Pull a coarse region label from a Korean place/search string. */
export function extractRegionLabel(input: {
  query?: string | null;
  address?: string | null;
}): string | null {
  const hay = [input.query, input.address].filter(Boolean).join(" ");
  if (!hay.trim()) {
    return null;
  }

  const full = hay.match(REGION_TOKEN)?.[1];
  if (full) {
    return full.trim();
  }

  const short = hay.match(CITY_SHORT)?.[1];
  if (short) {
    if (/유성/u.test(short)) {
      return "유성구";
    }
    if (/둔산/u.test(short)) {
      return "대전 유성구·둔산";
    }
    if (/강남|역삼/u.test(short)) {
      return "서울 강남구";
    }
    return short;
  }

  return null;
}
