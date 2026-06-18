import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";
import { parseBestTitleFromUrl } from "@/lib/enrichers/url-intelligence";

/** Best-effort product/place hint from URL path when og title is weak. */
export function parseHintFromUrlPath(rawUrl: string): string | null {
  return parseBestTitleFromUrl(rawUrl);
}

export function buildCommerceAppHref(rawUrl: string, domain: string): string | null {
  const normalized = domain.toLowerCase().replace(/^www\./, "");

  try {
    const url = normalizeInputUrl(rawUrl).href;

    if (normalized.includes("coupang")) {
      const productId =
        url.match(/\/products?\/(\d+)/i)?.[1] ??
        url.match(/\/vp\/(\d+)/i)?.[1];
      if (productId) {
        return `coupang://product?productId=${productId}`;
      }
    }

    if (normalized.includes("11st")) {
      return `elevenst://loadurl?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("musinsa")) {
      return `musinsaapp://web?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("gmarket")) {
      return `gmarket://open?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("smartstore") || normalized.includes("shopping.naver")) {
      return `naversearchapp://inappbrowser?url=${encodeURIComponent(url)}&target=new`;
    }

    if (normalized.includes("ably")) {
      return `ably://web?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("zigzag")) {
      return `zigzag://open?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("kurly") || normalized.includes("marketkurly")) {
      return `kurly://open?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("auction")) {
      return `auction://open?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("ssg") || normalized.includes("emart")) {
      return `ssg://open?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("lotte")) {
      return `lottemall://open?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("tmon")) {
      return `tmon://open?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("oliveyoung")) {
      return `oliveyoung://open?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function commerceAppLabel(domain: string): string {
  const normalized = domain.toLowerCase();

  if (normalized.includes("coupang")) {
    return "📱 쿠팡 앱으로";
  }
  if (normalized.includes("11st")) {
    return "📱 11번가 앱으로";
  }
  if (normalized.includes("musinsa")) {
    return "📱 무신사 앱으로";
  }
  if (normalized.includes("gmarket")) {
    return "📱 G마켓 앱으로";
  }
  if (normalized.includes("smartstore") || normalized.includes("shopping.naver")) {
    return "📱 네이버쇼핑 앱으로";
  }
  if (normalized.includes("ably")) {
    return "📱 에이블리 앱으로";
  }
  if (normalized.includes("zigzag")) {
    return "📱 지그재그 앱으로";
  }

  return "📱 쇼핑 앱으로";
}

export type TransportKind =
  | "stay"
  | "train"
  | "transit"
  | "navigation"
  | "flight"
  | "activity"
  | "mobility";

export function detectTransportKind(rawUrl: string, domain: string): TransportKind {
  const target = `${domain} ${rawUrl}`.toLowerCase();

  if (/yanolja|goodchoice|yeogi|airbnb|booking\.com|agoda|hotels\.com|hotel/i.test(target)) {
    if (/flight|air|항공|aviation/i.test(target) && !/hotel|stay|숙소/i.test(target)) {
      return "flight";
    }
    return "stay";
  }

  if (/korail|letskorail|srail|etk\.srail|korail\.com|train/i.test(target)) {
    return "train";
  }

  if (/tmap|t-map/i.test(target)) {
    return "navigation";
  }

  if (/bus\.kakao|kakaobus|bustago|subway|metro|transit|kakaomap.*bus/i.test(target)) {
    return "transit";
  }

  if (/klook/i.test(target)) {
    return "activity";
  }

  if (
    /trip\.com|skyscanner|expedia|koreanair|asiana|jejuair|twayair|jinair|airbusan|fly/i.test(
      target
    )
  ) {
    if (/hotel|stay|resort/i.test(target)) {
      return "stay";
    }
    return "flight";
  }

  return "mobility";
}

export function transportPrimaryLabel(kind: TransportKind) {
  switch (kind) {
    case "stay":
      return "🏨 숙소 보기";
    case "train":
      return "🚄 기차 예매 열기";
    case "transit":
      return "🚌 대중교통 열기";
    case "navigation":
      return "🚗 T맵 길찾기";
    case "flight":
      return "✈️ 항공·여행 열기";
    case "activity":
      return "🎫 티켓·액티비티 열기";
    default:
      return "🚉 교통 열기";
  }
}

export function buildTransportAppHref(
  rawUrl: string,
  domain: string,
  kind: TransportKind,
  hint: string | null
): string | null {
  const query = hint?.trim();
  const encodedUrl = encodeURIComponent(rawUrl);

  switch (kind) {
    case "navigation":
      if (query) {
        return `tmap://search?name=${encodeURIComponent(query)}`;
      }
      return `tmap://openurl?url=${encodedUrl}`;
    case "train":
      if (/korail|letskorail|srail/i.test(domain)) {
        return `korailtalk://open?url=${encodedUrl}`;
      }
      return null;
    case "stay":
      if (/yanolja/i.test(domain)) {
        return `yanoljamotel://open?url=${encodedUrl}`;
      }
      return null;
    case "transit":
      if (query) {
        return `kakaomap://search?q=${encodeURIComponent(query)}`;
      }
      return null;
    case "flight":
      if (/trip/i.test(domain)) {
        return `trip://deeplink?url=${encodedUrl}`;
      }
      if (/klook/i.test(domain)) {
        return `klook://webview?url=${encodedUrl}`;
      }
      if (/skyscanner/i.test(domain)) {
        return `skyscanner://webview?url=${encodedUrl}`;
      }
      return null;
    case "activity":
      if (/klook/i.test(domain)) {
        return `klook://webview?url=${encodedUrl}`;
      }
      if (/trip/i.test(domain)) {
        return `trip://deeplink?url=${encodedUrl}`;
      }
      return null;
    default:
      return null;
  }
}

export function transportAppLabel(kind: TransportKind, domain = "") {
  const normalized = domain.toLowerCase();

  switch (kind) {
    case "navigation":
      return "📱 T맵 앱으로";
    case "stay":
      return "📱 야놀자 앱으로";
    case "transit":
      return "🗺 카카오맵 검색";
    case "flight":
      if (/trip/i.test(normalized)) {
        return "📱 Trip.com 앱으로";
      }
      if (/klook/i.test(normalized)) {
        return "📱 Klook 앱으로";
      }
      if (/skyscanner/i.test(normalized)) {
        return "📱 Skyscanner 앱으로";
      }
      return "📱 여행 앱으로";
    case "activity":
      if (/klook/i.test(normalized)) {
        return "📱 Klook 앱으로";
      }
      if (/trip/i.test(normalized)) {
        return "📱 Trip.com 앱으로";
      }
      return "📱 액티비티 앱으로";
    default:
      return "📱 교통 앱으로";
  }
}

const TRANSPORT_HOST_SUFFIXES = [
  "yanolja.com",
  "nol.yanolja.com",
  "goodchoice.net",
  "yeogi.com",
  "korail.com",
  "letskorail.com",
  "srail.or.kr",
  "etk.srail.kr",
  "tmap.co.kr",
  "tmapmobility.com",
  "bus.kakao.com",
  "kakaobus.com",
  "bustago.or.kr",
  "airbus.koreaairports.co.kr",
  "klook.com",
  "trip.com",
  "kr.trip.com",
  "skyscanner.co.kr",
  "skyscanner.com",
  "expedia.co.kr",
  "kakaomobility.com",
  "airbnb.com",
  "booking.com",
  "agoda.com",
  "hotels.com",
];

export function isTransportDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  return TRANSPORT_HOST_SUFFIXES.some((suffix) => {
    const bare = suffix.replace(/^www\./, "");
    return normalized === bare || normalized.endsWith(`.${bare}`);
  });
}

export function isTransportUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (isTransportDomain(host)) {
      return true;
    }

    if (/t\.kakao\.com|kakaot\.com/i.test(host)) {
      return /train|bus|subway|mobility|transit/i.test(parsed.pathname + parsed.search);
    }

    return false;
  } catch {
    return false;
  }
}
