const BLOCKED_HOST_PATTERN =
  /(?:blog\.|brunch\.|tistory\.|dcinside\.|ruliweb\.|fmkorea\.|namu\.wiki|wikipedia\.|youtube\.|instagram\.)/i;

const BLOCKED_PATH_PATTERN =
  /(?:\/search(?:\/|$|\?)|\/category|\/categories|\/cate(?:\/|$|\?)|\/list(?:\/|$|\?)|\/blog|\/review|\/post(?:\/|$|\?)|\/article|\/news(?:\/|$|\?)|\/magazine|\/guide|\/tips|\/howto|\/ranking(?:\/|$|\?))/i;

const PRODUCT_PATH_PATTERN =
  /(?:\/products?\/|\/vp\/|\/goods\/|\/item(?:page)?|\/productions\/|\/catalog\/|smartstore\.naver\.com\/[^/]+\/products|cr\.shopping\.naver\.com\/)/i;

const SHOPPING_HOST_PATTERN =
  /(?:coupang\.com|11st\.co\.kr|gmarket\.co\.kr|auction\.co\.kr|ssg\.com|musinsa\.com|ohou\.se|a-bly\.com|zigzag\.kr|kurly\.com|lotteon\.com|hyundaihmall\.com|wconcept\.co\.kr|29cm\.co\.kr|smartstore\.naver\.com|shopping\.naver\.com)/i;

function normalizeUrl(raw: string): URL | null {
  try {
    const href = raw.trim();
    if (!href.startsWith("http://") && !href.startsWith("https://")) {
      return null;
    }
    return new URL(href);
  } catch {
    return null;
  }
}

/** Reject home, category, blog, and review pages. */
export function isBlockedProductUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl?.trim()) {
    return true;
  }

  const parsed = normalizeUrl(rawUrl);
  if (!parsed) {
    return true;
  }

  const host = parsed.hostname.toLowerCase();
  const pathQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();

  if (BLOCKED_HOST_PATTERN.test(host)) {
    return true;
  }

  if (BLOCKED_PATH_PATTERN.test(pathQuery)) {
    return true;
  }

  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" && !PRODUCT_PATH_PATTERN.test(pathQuery)) {
    return true;
  }

  if (/shopping\.naver\.com\/search/i.test(`${host}${pathQuery}`)) {
    return true;
  }

  if (/coupang\.com\/np\/(?:search|categories)/i.test(`${host}${pathQuery}`)) {
    return true;
  }

  return false;
}

/** Accept only URLs that look like a purchasable product detail page. */
export function isProductPageUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl?.trim() || isBlockedProductUrl(rawUrl)) {
    return false;
  }

  const parsed = normalizeUrl(rawUrl);
  if (!parsed) {
    return false;
  }

  const target = `${parsed.hostname}${parsed.pathname}${parsed.search}`.toLowerCase();

  if (PRODUCT_PATH_PATTERN.test(target)) {
    return true;
  }

  if (SHOPPING_HOST_PATTERN.test(parsed.hostname) && parsed.pathname.length > 1) {
    return !isBlockedProductUrl(rawUrl);
  }

  return false;
}

/** Higher = more direct purchase path (cart/product detail). */
export function scorePurchaseDirectness(rawUrl: string): number {
  if (!isProductPageUrl(rawUrl)) {
    return 0;
  }

  const target = rawUrl.toLowerCase();
  let score = 0.5;

  if (/\/vp\/products\/|\/products\/\d+/i.test(target)) {
    score += 0.35;
  }
  if (/smartstore\.naver\.com/i.test(target)) {
    score += 0.3;
  }
  if (/cr\.shopping\.naver\.com/i.test(target)) {
    score += 0.2;
  }
  if (/\/goods\/\d+/i.test(target)) {
    score += 0.25;
  }
  if (/\/productions\/\d+/i.test(target)) {
    score += 0.25;
  }

  return Math.min(score, 1);
}
