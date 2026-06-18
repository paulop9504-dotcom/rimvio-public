const MODEL_PATTERN =
  /(?:iphone|아이폰|galaxy|갤럭시|ipad|아이패드|macbook|맥북|airpods|에어팟|buds|버즈|playstation|ps5|xbox|닌텐도|switch|dyson|다이슨|lg|삼성|apple|애플)/iu;

const SPEC_PATTERN =
  /\d+\s*(?:gb|tb|ml|g|kg|l|cm|mm|inch|인치|mah|와트|w)\b|\b(?:m[1-9]|s\d{2}|a\d{2,3})\b|\b\d{3,5}[a-z]?\b|[A-Z]{2,}-?\d{2,}/iu;

const GENERIC_TITLE_PATTERN =
  /^(?:naver shopping result|상품|제품|item|product|쇼핑\s*결과)$/iu;

export function hasModelName(title: string | null | undefined): boolean {
  if (!title?.trim() || title.trim().length < 4) {
    return false;
  }

  if (GENERIC_TITLE_PATTERN.test(title.trim())) {
    return false;
  }

  const normalized = title.trim();

  if (MODEL_PATTERN.test(normalized)) {
    return true;
  }

  if (SPEC_PATTERN.test(normalized)) {
    return true;
  }

  const tokens = normalized.split(/\s+/).filter((t) => t.length >= 2);
  return tokens.length >= 3;
}

export function extractSpecHint(title: string | null | undefined): string | null {
  if (!title?.trim()) {
    return null;
  }

  const specMatch = title.match(
    /(\d+\s*(?:GB|TB|ML|G|KG|L|CM|MM|inch|인치|mAh|와트|W)\b|\b(?:M[1-9]|S\d{2}|A\d{2,3})\b)/iu,
  );
  return specMatch?.[1]?.trim() ?? null;
}

export function hasPriceOrSpec(title: string, price: number | null, specHint?: string | null): boolean {
  if (price !== null && Number.isFinite(price) && price > 0) {
    return true;
  }
  if (specHint?.trim()) {
    return true;
  }
  return extractSpecHint(title) !== null;
}
