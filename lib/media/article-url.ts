import { isNaverContentUrl, detectNaverContentKind } from "@/lib/resolvers/naver-deep-links";
import { isYouTubeDomain } from "@/lib/enrichers/youtube-url";
import type { LinkRow } from "@/types/database";

const ARTICLE_HOST_PATTERN =
  /(?:^|\.)((?:medium|tistory|velog|brunch|notion|substack|ghost|wordpress|blogger|wikidocs|tldr|news|theverge|techcrunch)\.(?:com|io|net|org|site|dev|kr)|news\.naver\.com|n\.news\.naver\.com|blog\.naver\.com|post\.naver\.com|m\.blog\.naver\.com|cafe\.naver\.com|m\.cafe\.naver\.com)$/i;

export function isArticleUrl(
  url: string,
  sourceType?: string | null,
  category?: string | null
) {
  if (isYouTubeDomainFromUrl(url)) {
    return false;
  }

  if (sourceType === "youtube" || sourceType === "ott") {
    return false;
  }

  if (sourceType === "naver") {
    return isNaverArticleUrl(url);
  }

  if (category === "research") {
    return true;
  }

  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (ARTICLE_HOST_PATTERN.test(host)) {
      return true;
    }

    if (isNaverContentUrl(url)) {
      return isNaverArticleUrl(url);
    }
  } catch {
    return false;
  }

  return false;
}

function isYouTubeDomainFromUrl(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return isYouTubeDomain(host);
  } catch {
    return false;
  }
}

export function isNaverArticleUrl(url: string) {
  if (!isNaverContentUrl(url)) {
    return false;
  }

  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const kind = detectNaverContentKind(url, host);
    return kind === "blog" || kind === "news" || kind === "cafe" || kind === "content";
  } catch {
    return false;
  }
}

export function shouldShowTimeReceipt(link: Pick<LinkRow, "original_url" | "domain" | "source_type" | "category">) {
  if (link.source_type === "youtube" || isYouTubeDomain(link.domain)) {
    return true;
  }

  return isArticleUrl(link.original_url, link.source_type, link.category);
}
