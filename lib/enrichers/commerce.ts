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
import { extractUrlsFromText } from "@/lib/enrichers/extract-urls";
import {
  buildCommerceAppHref,
  commerceAppLabel,
} from "@/lib/resolvers/transport-commerce-deep-links";
import {
  parseCommerceHintFromUrl,
  isWeakTitleHint,
  commercePrimaryLabel,
  parseBestTitleFromUrl,
  resolveBestTitle,
} from "@/lib/enrichers/url-intelligence";
import { appendPriceToTitle } from "@/lib/commerce/append-price-to-title";
import {
  isSecondhandDomain,
  normalizeSecondhandTitle,
} from "@/lib/commerce/commerce-cleaner";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { LinkActionItem } from "@/types/database";

export { isCommerceDomain } from "@/lib/enrichers/url-intelligence";

const MAX_ACTIONS = 5;

function extractKakaoCouponActions(
  description: string | null,
  limit: number,
  productTitle: string | null
) {
  if (!description?.trim() || limit <= 0) {
    return [];
  }

  return extractUrlsFromText(description)
    .filter((href) => /pf\.kakao\.com|open\.kakao\.com/i.test(href))
    .slice(0, limit)
    .map((href) =>
      createOpenAction({
        label: "🎁 플친 쿠폰",
        href,
        icon: "link",
        copyText: productTitle ?? href,
      })
    );
}

function buildCommerceActions(
  url: string,
  domain: string,
  description: string | null,
  title: string | null,
  urlHint: string | null
) {
  const copyText = title?.trim() || urlHint?.trim() || null;

  const primary = createOpenAction({
    label: commercePrimaryLabel(domain),
    href: url,
    icon: "link",
    copyText,
  });

  const secondary: LinkActionItem[] = [];
  const appHref = buildCommerceAppHref(url, domain);

  if (appHref) {
    secondary.push(
      createOpenAction({
        label: commerceAppLabel(domain),
        href: appHref,
        icon: "link",
        copyText,
        contextBoost: "installed-app",
      })
    );
  }

  if (copyText) {
    secondary.push(
      createCopyOnlyAction(`📋 ${copyText.slice(0, 16)} 복사`, copyText)
    );
  }

  const coupons = extractKakaoCouponActions(
    description,
    MAX_ACTIONS - 1 - secondary.length,
    copyText
  );

  secondary.push(...coupons);

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

export const commerceEnricher: Enricher = {
  id: "commerce-v1",

  async enrich(
    rawUrl: string,
    _context: EnricherContext
  ): Promise<EnrichedLink> {
    const parsed = normalizeInputUrl(rawUrl);
    const metadata = await fetchPageMetadata(parsed.href);
    const commerceHint = parseCommerceHintFromUrl(parsed.href, parsed.hostname);
    const titleCandidate = resolveBestTitle({
      metadataTitle: metadata.title,
      rawUrl: parsed.href,
      domain: parsed.hostname,
    });
    const normalized = withDomainFallback(metadata, {
      title: titleCandidate ?? commerceHint,
      image: metadata.image,
      description: metadata.description,
    });

    const domain = normalized.domain;
    const rawTitle = titleCandidate ?? commerceHint ?? normalized.title;
    const normalizedTitle =
      rawTitle && isSecondhandDomain(domain)
        ? normalizeSecondhandTitle(rawTitle)
        : rawTitle;
    const title = appendPriceToTitle(normalizedTitle, metadata.priceWon);
    const urlHint = commerceHint ?? parseBestTitleFromUrl(parsed.href, parsed.hostname);

    const actions = buildCommerceActions(
      normalized.url,
      normalized.domain,
      normalized.description,
      title,
      urlHint
    );

    return {
      url: normalized.url,
      domain: normalized.domain,
      title: title ?? normalized.domain,
      image: normalized.image,
      description: normalized.description,
      actions,
      enricher_id: "commerce-v1",
      source_type: "commerce",
      fallback: {
        ...normalized.fallback,
        titleFromDomain: !Boolean(
          (metadata.title?.trim() && !isWeakTitleHint(metadata.title)) ||
            commerceHint?.trim() ||
            titleCandidate?.trim()
        ),
      },
    };
  },
};
