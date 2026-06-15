import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

export type DeliveryBrand = "baemin" | "yogiyo" | "coupangeats" | "delivery";

const DELIVERY_HOST_SUFFIXES = [
  "baemin.com",
  "yogiyo.co.kr",
  "eats.coupang.com",
  "delivery.wemakeprice.com",
];

export function detectDeliveryBrand(
  rawUrl: string,
  domain: string
): DeliveryBrand {
  const target = `${domain} ${rawUrl}`.toLowerCase();

  if (/baemin|woowahan|woowabros/i.test(target)) {
    return "baemin";
  }

  if (/yogiyo/i.test(target)) {
    return "yogiyo";
  }

  if (/coupang.*eats|eats\.coupang/i.test(target)) {
    return "coupangeats";
  }

  return "delivery";
}

export function isDeliveryDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  return DELIVERY_HOST_SUFFIXES.some((suffix) => {
    const bare = suffix.replace(/^www\./, "");
    return normalized === bare || normalized.endsWith(`.${bare}`);
  });
}

export function isCoupangEatsUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "eats.coupang.com") {
      return true;
    }

    return host.includes("coupang") && /\/eats\b/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function isDeliveryUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (isDeliveryDomain(host)) {
      return true;
    }

    return isCoupangEatsUrl(rawUrl);
  } catch {
    return false;
  }
}

export function deliveryPrimaryLabel(brand: DeliveryBrand) {
  switch (brand) {
    case "baemin":
      return "🍔 배민에서 보기";
    case "yogiyo":
      return "🍔 요기요에서 보기";
    case "coupangeats":
      return "🍽 쿠팡이츠에서 보기";
    default:
      return "🍱 배달 주문 열기";
  }
}

export function deliveryAppLabel(brand: DeliveryBrand) {
  switch (brand) {
    case "baemin":
      return "📱 배민 앱으로";
    case "yogiyo":
      return "📱 요기요 앱으로";
    case "coupangeats":
      return "📱 쿠팡이츠 앱으로";
    default:
      return "📱 배달 앱으로";
  }
}

export function buildDeliveryAppHref(rawUrl: string, brand: DeliveryBrand): string | null {
  try {
    const url = normalizeInputUrl(rawUrl).href;
    const encoded = encodeURIComponent(url);

    switch (brand) {
      case "baemin":
        return `baemin://webview?webview_url=${encoded}`;
      case "yogiyo":
        return `yogiyoapp://webview?url=${encoded}`;
      case "coupangeats":
        return `coupang://link?url=${encoded}`;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function buildDeliveryMapSearchHref(hint: string | null) {
  const query = hint?.trim();
  if (!query) {
    return null;
  }

  return `kakaomap://search?q=${encodeURIComponent(query)}`;
}
