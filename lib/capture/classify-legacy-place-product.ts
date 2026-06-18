/** Legacy place/product/url scoring — avoids recursion with detectCaptureIntent. */

import { foodVisionSearchFallback } from "@/lib/capture/infer-signature-food-place";
import { isGarbledCaptureOcr } from "@/lib/capture/is-garbled-capture-ocr";
import { extractExplicitUrls } from "@/lib/screenshot/explicit-urls";

const OCR_NOISE =
  /instagram|tiktok|youtube|facebook|threads|reels|좋아요|댓글|공유하기|팔로우|follow|views|subscriber|구독|더보기|저장됨|saved|share|like|comment|profile|프로필|스토리|story|번역/i;

const PLACE_SIGNAL =
  /카페|맛집|restaurant|cafe|베이커리|브런치|식당|bistro|bakery|역\s*\d|번\s*출구|출구|주소|위치|address|서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|\d+\s*번길|\d+\s*로\b|\d+\s*동\b|\d+\s*구\b|강남|홍대|이태원|성수|연남|망원|을지로|명동|해운대/i;

const PRODUCT_FLUFF_ONLY =
  /^(무료배송|할인|쿠폰|옵션|구매|장바구니|cart|buy|sell|price|deal|used|중고|신품|품절|재고)$/i;

export const PRODUCT_SIGNAL =
  /원\b|₩|만원|할인|쿠폰|무료배송|재고|옵션|색상|사이즈|size|color|price|deal|used|중고|신품|품절|구매|장바구니|cart|buy|sell|product|상품|wh-|galaxy|iphone|아이폰|갤럭시|sony|nintendo|switch|playstation|맥북|macbook|ipad|아이패드/i;

const FOOD_VISION_SIGNAL =
  /food|dish|meal|cuisine|snack|breakfast|lunch|dinner|restaurant|dining|tteok|bokki|toast|sandwich|noodle|ramen|sushi|pizza|burger|coffee|beverage|분식|떡볶|토스트|음식|요리|맛집|식당|카페|커피|brunch|dessert|bakery|bistro|street\s*food|korean\s*food/i;

export function isFoodVision(
  vision?: {
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
  } | null
) {
  const blob = [
    ...(vision?.bestGuessLabels ?? []),
    ...(vision?.webEntities ?? []),
    ...(vision?.labels ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return FOOD_VISION_SIGNAL.test(blob);
}

function cleanLine(line: string) {
  return line
    .replace(/[^\p{L}\p{N}\s·\-_/.,#+()&]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulLines(text: string) {
  return text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => line.length >= 2 && !OCR_NOISE.test(line));
}

function scorePlace(line: string) {
  let score = 0;
  if (PLACE_SIGNAL.test(line)) {
    score += 3;
  }
  if (/^\d{2,4}\s/.test(line)) {
    score += 1;
  }
  if (line.length >= 4 && line.length <= 40) {
    score += 1;
  }
  if (PRODUCT_SIGNAL.test(line)) {
    score -= 2;
  }
  return score;
}

function scoreProduct(line: string) {
  if (PRODUCT_FLUFF_ONLY.test(line) || line.length < 4) {
    return -1;
  }

  let score = 0;
  if (PRODUCT_SIGNAL.test(line)) {
    score += 3;
  }
  if (/\d{1,3}(?:,\d{3})+\s*원|\d+\s*원|₩/.test(line)) {
    score += 2;
  }
  if (/[A-Za-z][A-Za-z0-9+\-]{2,}/.test(line)) {
    score += 2;
  }
  if (line.length >= 5 && line.length <= 80) {
    score += 1;
  }
  if (PLACE_SIGNAL.test(line)) {
    score -= 1;
  }
  return score;
}

function pickBestLine(lines: string[], scorer: (line: string) => number) {
  let best = "";
  let bestScore = -Infinity;

  for (const line of lines) {
    const score = scorer(line);
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  }

  return bestScore > 0 ? best : "";
}

export function classifyLegacyPlaceProduct(input: {
  text: string;
  vision?: {
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
    fashionScore?: number;
  } | null;
}): { kind: "url" | "place" | "product"; query: string; urls?: string[] } | null {
  const rawText = input.text;
  const visionQuery =
    input.vision?.bestGuessLabels?.[0] ??
    input.vision?.webEntities?.[0] ??
    input.vision?.labels?.[0] ??
    "";

  const urls = extractExplicitUrls(rawText);
  if (urls.length > 0) {
    return { kind: "url", query: urls[0]!, urls };
  }

  const lines = meaningfulLines(rawText);
  const placeQuery = pickBestLine(lines, scorePlace);
  const productQuery = pickBestLine(lines, scoreProduct);

  if (
    isFoodVision(input.vision) &&
    (isGarbledCaptureOcr(rawText) || !productQuery || scoreProduct(productQuery) <= 1)
  ) {
    return {
      kind: "place",
      query: foodVisionSearchFallback(input.vision).slice(0, 80),
    };
  }

  if (placeQuery && scorePlace(placeQuery) >= scoreProduct(productQuery)) {
    return { kind: "place", query: placeQuery };
  }

  if (productQuery) {
    return { kind: "product", query: productQuery };
  }

  const fallback = lines.sort((a, b) => b.length - a.length)[0];
  if ((!fallback || fallback.length < 3) && visionQuery.trim()) {
    const fashion = (input.vision?.fashionScore ?? 0) >= 2;
    if (fashion) {
      return { kind: "product", query: visionQuery.slice(0, 80) };
    }

    if (PLACE_SIGNAL.test(visionQuery) || isFoodVision(input.vision)) {
      return { kind: "place", query: visionQuery.slice(0, 80) };
    }

    return { kind: "product", query: visionQuery.slice(0, 80) };
  }

  if (!fallback || fallback.length < 3) {
    return null;
  }

  if (isFoodVision(input.vision)) {
    return {
      kind: "place",
      query: foodVisionSearchFallback(input.vision).slice(0, 80),
    };
  }

  return {
    kind: PLACE_SIGNAL.test(fallback) ? "place" : "product",
    query: fallback.slice(0, 80),
  };
}
