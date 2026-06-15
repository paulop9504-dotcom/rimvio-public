import {
  attachCopyToActions,
  createCopyOnlyAction,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import {
  fetchPageMetadata,
  normalizeInputUrl,
  withDomainFallback,
} from "@/lib/enrichers/fetch-page-metadata";
import {
  buildDeliveryAppHref,
  buildDeliveryMapSearchHref,
  deliveryAppLabel,
  deliveryPrimaryLabel,
  detectDeliveryBrand,
} from "@/lib/resolvers/delivery-deep-links";
import { parseHintFromUrlPath } from "@/lib/resolvers/transport-commerce-deep-links";
import {
  parseDeliveryShopFromUrl,
  resolveDeliveryShopTitle,
  isGenericDeliverySiteTitle,
} from "@/lib/enrichers/parse-delivery-shop";
import { isWeakTitleHint, parseTitleFromUrl } from "@/lib/enrichers/url-intelligence";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

export { isDeliveryDomain, isDeliveryUrl } from "@/lib/resolvers/delivery-deep-links";

const MAX_ACTIONS = 5;

function resolveDeliveryHint(
  rawUrl: string,
  metadataTitle: string | null,
  enrichedTitle: string | null
) {
  const fromUrl = parseDeliveryShopFromUrl(rawUrl);
  if (fromUrl) {
    return fromUrl;
  }

  const resolved = resolveDeliveryShopTitle(rawUrl, metadataTitle);
  if (resolved) {
    return resolved;
  }

  const fallback =
    enrichedTitle?.trim() ||
    parseHintFromUrlPath(rawUrl) ||
    parseTitleFromUrl(rawUrl) ||
    null;

  if (fallback && !isWeakTitleHint(fallback)) {
    return fallback;
  }

  return null;
}

function deliveryCopyFallback(brand: ReturnType<typeof detectDeliveryBrand>) {
  switch (brand) {
    case "baemin":
      return "배민";
    case "yogiyo":
      return "요기요";
    case "coupangeats":
      return "쿠팡이츠";
    default:
      return null;
  }
}

function sanitizeDeliveryCopyText(
  copyText: string | null,
  brand: ReturnType<typeof detectDeliveryBrand>
) {
  if (!copyText?.trim() || isGenericDeliverySiteTitle(copyText)) {
    return deliveryCopyFallback(brand);
  }

  return copyText.trim();
}

function buildDeliveryActions(
  url: string,
  domain: string,
  title: string | null,
  hint: string | null
) {
  const brand = detectDeliveryBrand(url, domain);
  const copyText = sanitizeDeliveryCopyText(hint?.trim() || title?.trim() || null, brand);

  const primary = createOpenAction({
    label: deliveryPrimaryLabel(brand),
    href: url,
    icon: "link",
    copyText,
  });

  const secondary: LinkActionItem[] = [];
  const appHref = buildDeliveryAppHref(url, brand);

  if (appHref) {
    secondary.push(
      createOpenAction({
        label: deliveryAppLabel(brand),
        href: appHref,
        icon: "link",
        copyText,
        contextBoost: "installed-app",
      })
    );
  }

  const mapHref = buildDeliveryMapSearchHref(copyText);
  if (mapHref) {
    secondary.push(
      createOpenAction({
        label: copyText
          ? `🗺 ${copyText.slice(0, 10)} 위치`
          : "🗺 카카오맵 검색",
        href: mapHref,
        icon: "kakaomap",
        copyText,
      })
    );
  }

  if (copyText) {
    secondary.push(
      createCopyOnlyAction(`📋 ${copyText.slice(0, 16)} 복사`, copyText)
    );
  }

  secondary.push(
    createOpenAction({
      label: openOriginalLabel(),
      href: url,
      icon: "external-link",
      copyText,
    })
  );

  return attachCopyToActions([primary, ...secondary], copyText).slice(
    0,
    MAX_ACTIONS
  );
}

export const deliveryEnricher: Enricher = {
  id: "delivery-v1",

  async enrich(
    rawUrl: string,
    _context: EnricherContext
  ): Promise<EnrichedLink> {
    const parsed = normalizeInputUrl(rawUrl);
    const metadata = await fetchPageMetadata(parsed.href);
    const shopHint = resolveDeliveryHint(parsed.href, metadata.title, null);
    const normalized = withDomainFallback(metadata, {
      title: shopHint ?? metadata.title,
      image: metadata.image,
      description: metadata.description,
    });

    const hint = resolveDeliveryHint(parsed.href, metadata.title, normalized.title);
    const title = hint ?? normalized.title;

    const actions = buildDeliveryActions(
      normalized.url,
      normalized.domain,
      title,
      hint
    );

    return {
      url: normalized.url,
      domain: normalized.domain,
      title,
      image: normalized.image,
      description: normalized.description,
      actions,
      enricher_id: "delivery-v1",
      source_type: "delivery",
      fallback: {
        ...normalized.fallback,
        titleFromDomain: !Boolean(
          shopHint?.trim() ||
            (metadata.title?.trim() && !isWeakTitleHint(metadata.title))
        ),
      },
    };
  },
};
