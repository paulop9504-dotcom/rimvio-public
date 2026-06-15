import type { AppLocale } from "@/lib/i18n/types";
import type { MarketId } from "@/lib/markets/types";

const KR_HOST =
  /(?:^|\.)((?:co\.kr|kr|bunjang|joongna|junggo|daangn|karrot|coupang|gmarket|11st|musinsa|danawa|smartstore|shopping\.naver|naver\.com|ssg|lotte|auction|tmon|zigzag|ably|kurly|oliveyoung|yo-go))/i;

const JP_HOST =
  /(?:^|\.)(co\.jp|mercari|fril\.jp|rakuma|kakaku|yahoo\.co\.jp|amazon\.co\.jp|rakuten|zozo|yodobashi)/i;

const US_HOST =
  /(?:^|\.)(amazon\.com|ebay\.com|walmart\.com|bestbuy\.com|target\.com|poshmark\.com|depop\.com|facebook\.com)/i;

export function marketFromAppLocale(locale: AppLocale | null | undefined): MarketId {
  switch (locale) {
    case "ko":
      return "kr";
    case "ja":
      return "jp";
    case "en":
    case "fil":
      return "us";
    default:
      return "global";
  }
}

export function detectMarketFromUrl(url: string, domain?: string | null): MarketId {
  const haystack = `${domain ?? ""} ${url}`.toLowerCase();

  if (KR_HOST.test(haystack) || /\.co\.kr\b/.test(haystack)) {
    return "kr";
  }

  if (JP_HOST.test(haystack) || /\.co\.jp\b/.test(haystack)) {
    return "jp";
  }

  if (US_HOST.test(haystack)) {
    return "us";
  }

  if (/amazon\.co\.uk|ebay\.co\.uk|gumtree/.test(haystack)) {
    return "global";
  }

  return "global";
}

export function resolveMarket(input: {
  url: string;
  domain?: string | null;
  locale?: AppLocale | null;
}): MarketId {
  const fromUrl = detectMarketFromUrl(input.url, input.domain);
  if (fromUrl !== "global") {
    return fromUrl;
  }

  return marketFromAppLocale(input.locale);
}
