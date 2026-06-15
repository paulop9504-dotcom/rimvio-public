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
import { isWeakTitleHint, parseTitleFromUrl } from "@/lib/enrichers/url-intelligence";
import {
  buildTicketAppHref,
  detectTicketBrand,
  parseTicketHintFromUrl,
  ticketAppLabel,
  ticketBrandTitle,
  ticketPrimaryLabel,
} from "@/lib/resolvers/ticket-deep-links";
import { sanitizeLinkTitle } from "@/lib/feed/sanitize-link-title";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

export { isTicketUrl } from "@/lib/resolvers/ticket-deep-links";

const MAX_ACTIONS = 5;

function resolveTicketHint(rawUrl: string, title: string | null, domain: string) {
  const brand = detectTicketBrand(rawUrl, domain);

  return (
    parseTicketHintFromUrl(rawUrl) ||
    (title?.trim() && !isWeakTitleHint(title) ? title.trim() : null) ||
    ticketBrandTitle(brand) ||
    parseTitleFromUrl(rawUrl)
  );
}

function buildTicketActions(
  url: string,
  domain: string,
  title: string | null,
  hint: string | null
) {
  const brand = detectTicketBrand(url, domain);
  const copyText = hint?.trim() || title?.trim() || null;

  const primary = createOpenAction({
    label: ticketPrimaryLabel(brand),
    href: url,
    icon: "link",
    copyText,
  });

  const secondary: LinkActionItem[] = [];
  const appHref = buildTicketAppHref(url, brand);

  if (appHref) {
    secondary.push(
      createOpenAction({
        label: ticketAppLabel(brand),
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

export const ticketEnricher: Enricher = {
  id: "ticket-v1",

  async enrich(rawUrl: string, _context: EnricherContext): Promise<EnrichedLink> {
    const parsed = normalizeInputUrl(rawUrl);
    const metadata = await fetchPageMetadata(parsed.href);
    const normalized = withDomainFallback(metadata, {
      title: metadata.title,
      image: metadata.image,
      description: metadata.description,
    });
    const title = sanitizeLinkTitle({
      title: metadata.title,
      original_url: parsed.href,
      domain: parsed.hostname,
      source_type: "ticket",
    });
    const hint = resolveTicketHint(parsed.href, title, parsed.hostname);

    return {
      url: normalized.url,
      domain: normalized.domain,
      title,
      image: normalized.image,
      description: normalized.description,
      actions: buildTicketActions(normalized.url, normalized.domain, title, hint),
      enricher_id: "ticket-v1",
      source_type: "ticket",
      fallback: {
        ...normalized.fallback,
        titleFromDomain: !Boolean(
          (metadata.title?.trim() && !isWeakTitleHint(metadata.title)) ||
            hint?.trim()
        ),
      },
    };
  },
};
