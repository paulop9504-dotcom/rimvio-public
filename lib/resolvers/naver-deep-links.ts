import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

export type NaverContentKind = "blog" | "cafe" | "news" | "place" | "content";

const NAVER_EXCLUDED =
  /map\.naver|smartstore|shopping\.naver|pay\.naver|mail\.naver|finance\.naver/i;

export function isNaverContentUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (NAVER_EXCLUDED.test(host) || NAVER_EXCLUDED.test(path)) {
      return false;
    }

    if (/^blog\.naver\.com$/i.test(host)) return true;
    if (/^m\.blog\.naver\.com$/i.test(host)) return true;
    if (/^post\.naver\.com$/i.test(host)) return true;
    if (/^cafe\.naver\.com$/i.test(host)) return true;
    if (/^m\.cafe\.naver\.com$/i.test(host)) return true;
    if (/^news\.naver\.com$/i.test(host)) return true;
    if (/^n\.news\.naver\.com$/i.test(host)) return true;
    if (/^place\.naver\.com$/i.test(host)) return true;
    if (/^naver\.me$/i.test(host)) return true;

    if (/naver\.com$/i.test(host) && /\/(blog|cafe|news|place)\b/i.test(path)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function detectNaverContentKind(rawUrl: string, domain: string): NaverContentKind {
  const target = `${domain} ${rawUrl}`.toLowerCase();

  if (/cafe\.naver|m\.cafe/i.test(target)) return "cafe";
  if (/news\.naver|n\.news/i.test(target)) return "news";
  if (/place\.naver/i.test(target)) return "place";
  if (/blog\.naver|post\.naver|m\.blog/i.test(target)) return "blog";

  return "content";
}

export function naverPrimaryLabel(kind: NaverContentKind) {
  switch (kind) {
    case "blog":
      return "📝 블로그 글 열기";
    case "cafe":
      return "💬 카페 글 열기";
    case "news":
      return "📰 뉴스 열기";
    case "place":
      return "📍 플레이스 열기";
    default:
      return "🔗 네이버에서 열기";
  }
}

export function naverAppLabel(kind: NaverContentKind) {
  switch (kind) {
    case "place":
      return "🗺 네이버지도 앱으로";
    default:
      return "📱 네이버 앱으로";
  }
}

export function buildNaverAppHref(
  rawUrl: string,
  kind: NaverContentKind
): string | null {
  try {
    const url = normalizeInputUrl(rawUrl).href;
    const encoded = encodeURIComponent(url);

    if (kind === "place") {
      return `nmap://place?url=${encoded}`;
    }

    return `naversearchapp://inappbrowser?url=${encoded}&target=new`;
  } catch {
    return null;
  }
}

import { parseBestTitleFromUrl } from "@/lib/enrichers/url-intelligence";

export function parseNaverHintFromUrl(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (/blog\.naver|m\.blog\.naver/i.test(host) && segments[0]) {
      const blogger = decodeURIComponent(segments[0].replace(/\+/g, " ")).trim();
      if (blogger.length >= 2 && /[가-힣a-zA-Z]/.test(blogger)) {
        return `${blogger} 블로그`;
      }
    }

    if (/cafe\.naver|m\.cafe\.naver/i.test(host) && segments[0]) {
      const cafe = decodeURIComponent(segments[0].replace(/\+/g, " "))
        .replace(/[-_]+/g, " ")
        .trim();
      if (cafe.length >= 2 && /[가-힣a-zA-Z]/.test(cafe)) {
        return cafe;
      }
    }

    const best = parseBestTitleFromUrl(rawUrl, host);
    if (best) {
      return best;
    }

    const last = segments[segments.length - 1];
    if (!last || /^\d+$/.test(last)) {
      return null;
    }

    const decoded = decodeURIComponent(last.replace(/\+/g, " "))
      .replace(/[-_]+/g, " ")
      .trim();

    return decoded.length >= 2 && /[가-힣a-zA-Z]/.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
