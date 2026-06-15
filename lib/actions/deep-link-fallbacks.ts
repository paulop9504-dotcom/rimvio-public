import { buildNaverWebSearchHref } from "@/lib/actions/search-urls";
import {
  buildKakaoMapSearchWebHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import { isCustomSchemeHref } from "@/lib/actions/open-with-fallback";

function readQueryParam(href: string, key: string) {
  try {
    const query = href.includes("?") ? href.split("?")[1] : "";
    const params = new URLSearchParams(query);
    const value = params.get(key);
    return value?.trim() ? decodeURIComponent(value) : null;
  } catch {
    return null;
  }
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (value?.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function resolveDeepLinkWebFallback(href: string, copyText?: string | null) {
  const trimmed = href.trim();
  const lower = trimmed.toLowerCase();

  if (!isCustomSchemeHref(trimmed)) {
    return null;
  }

  if (lower.startsWith("tmap://")) {
    const query = firstNonEmpty(
      readQueryParam(trimmed, "address"),
      readQueryParam(trimmed, "name"),
      readQueryParam(trimmed, "q"),
      copyText
    );
    return query ? buildNaverMapSearchWebHref(query) : "https://map.naver.com";
  }

  if (lower.startsWith("nmap://")) {
    const query = firstNonEmpty(readQueryParam(trimmed, "query"), copyText);
    return query ? buildNaverMapSearchWebHref(query) : "https://map.naver.com";
  }

  if (lower.startsWith("kakaomap://")) {
    const query = firstNonEmpty(readQueryParam(trimmed, "q"), copyText);
    return query ? buildKakaoMapSearchWebHref(query) : "http://m.map.kakao.com";
  }

  if (lower.startsWith("kakaot://") || lower.startsWith("kakaotaxi://")) {
    return "https://t.kakao.com";
  }

  if (lower.startsWith("supertoss://") || lower.startsWith("kakaopay://")) {
    return "https://toss.im/";
  }

  if (lower.startsWith("notion://")) {
    return "https://www.notion.so/";
  }

  if (lower.startsWith("spotify://")) {
    return "https://open.spotify.com/";
  }

  if (lower.startsWith("coupang://") || lower.startsWith("coupangapp://")) {
    const query = firstNonEmpty(readQueryParam(trimmed, "q"), copyText);
    return query
      ? `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`
      : "https://www.coupang.com";
  }

  if (lower.startsWith("tel:") || lower.startsWith("telprompt:") || lower.startsWith("mailto:") || lower.startsWith("sms:")) {
    return null;
  }

  if (lower.startsWith("rimvio://")) {
    return null;
  }

  const query = firstNonEmpty(copyText, readQueryParam(trimmed, "q"), readQueryParam(trimmed, "name"));
  return query ? buildNaverWebSearchHref(query) : "https://www.google.com";
}

export function isKnownDeepLinkScheme(href: string) {
  const lower = href.trim().toLowerCase();
  return /^(tmap|nmap|kakaomap|kakaot|kakaotaxi|coupang|coupangapp):/.test(lower);
}
