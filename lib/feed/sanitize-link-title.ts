import { isGarbledCaptureOcr } from "@/lib/capture/is-garbled-capture-ocr";
import { parseDeliveryShopFromUrl } from "@/lib/enrichers/parse-delivery-shop";
import {
  isCommerceDomain,
  parseBestTitleFromUrl,
  parseCommerceHintFromUrl,
  isWeakTitleHint,
} from "@/lib/enrichers/url-intelligence";
import { isDeliveryUrl } from "@/lib/resolvers/delivery-deep-links";
import {
  detectOttBrand,
  isOttUrl,
  ottPrimaryLabel,
} from "@/lib/resolvers/ott-deep-links";
import {
  detectTicketBrand,
  isTicketUrl,
  ticketBrandTitle,
} from "@/lib/resolvers/ticket-deep-links";
import {
  detectTransportKind,
  isTransportUrl,
  transportPrimaryLabel,
} from "@/lib/resolvers/transport-commerce-deep-links";
import { getDomainTitle } from "@/lib/utils/domain-gradient";

type SanitizeLinkTitleInput = {
  title?: string | null;
  original_url: string;
  domain: string;
  source_type?: string | null;
  category?: string | null;
};

function friendlyTitleFromSite(input: SanitizeLinkTitleInput): string | null {
  const { original_url, domain, source_type } = input;
  const host = domain.toLowerCase().replace(/^www\./, "");

  if (source_type === "ticket" || isTicketUrl(original_url)) {
    return ticketBrandTitle(detectTicketBrand(original_url, domain));
  }

  if (source_type === "commerce" || isCommerceDomain(domain)) {
    return parseCommerceHintFromUrl(original_url, domain);
  }

  if (source_type === "ott" || isOttUrl(original_url)) {
    const brand = detectOttBrand(original_url, domain);
    return ottPrimaryLabel(brand).replace(/^▶️\s*/, "");
  }

  if (source_type === "delivery" || isDeliveryUrl(original_url)) {
    return parseDeliveryShopFromUrl(original_url) ?? "배달 주문";
  }

  if (source_type === "transport" || isTransportUrl(original_url)) {
    return transportPrimaryLabel(detectTransportKind(original_url, domain));
  }

  if (/interpark|nol\.universe/i.test(host)) {
    return ticketBrandTitle(detectTicketBrand(original_url, domain));
  }

  if (/melon\.com/i.test(host) && /ticket|concert|performance/i.test(original_url)) {
    return "멜론티켓";
  }

  if (/yes24\.com/i.test(host) && /ticket/i.test(original_url)) {
    return "YES24 티켓";
  }

  if (/youtube|youtu\.be/i.test(host)) {
    return "YouTube 영상";
  }

  if (/naver\.com/i.test(host)) {
    if (/blog/i.test(original_url)) {
      return "네이버 블로그";
    }
    if (/news/i.test(original_url)) {
      return "네이버 뉴스";
    }
    if (/cafe/i.test(original_url)) {
      return "네이버 카페";
    }
  }

  if (/coupang\.com/i.test(host) && !/\/eats\b/i.test(original_url)) {
    return "쿠팡 상품";
  }

  if (/ticketlink/i.test(host)) {
    return "티켓 예매";
  }

  return null;
}

function isGenericDomainTitle(title: string, domain: string) {
  const normalized = title.trim().toLowerCase();
  const domainLabel = getDomainTitle(domain).toLowerCase();

  return (
    normalized === domainLabel ||
    normalized === domain.replace(/^www\./, "").toLowerCase()
  );
}

/** Never returns garbled text — always a safe string for storage. */
export function sanitizeLinkTitle(input: SanitizeLinkTitleInput): string {
  const stored = input.title?.trim() || null;

  if (stored && !isWeakTitleHint(stored)) {
    return stored;
  }

  const fromUrl = parseBestTitleFromUrl(input.original_url, input.domain);
  if (fromUrl && !isWeakTitleHint(fromUrl)) {
    return fromUrl;
  }

  const fromSite = friendlyTitleFromSite(input);
  if (fromSite && !isWeakTitleHint(fromSite)) {
    return fromSite;
  }

  return getDomainTitle(input.domain) || "링크";
}

/** UI title — null hides the headline (domain-only is cleaner). */
export function getDisplayTitle(input: SanitizeLinkTitleInput): string | null {
  const safe = sanitizeLinkTitle(input);

  if (isGenericDomainTitle(safe, input.domain)) {
    return null;
  }

  return safe;
}

export function getDisplayTitleForLink(link: {
  title: string;
  original_url: string;
  domain: string;
  source_type?: string | null;
  category?: string | null;
}) {
  const title =
    link.source_type === "screenshot" &&
    link.title?.trim() &&
    isGarbledCaptureOcr(link.title)
      ? null
      : link.title;

  return getDisplayTitle({
    title,
    original_url: link.original_url,
    domain: link.domain,
    source_type: link.source_type,
    category: link.category,
  });
}
