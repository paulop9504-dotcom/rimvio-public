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
  buildOttAppHref,
  detectOttBrand,
  ottAppLabel,
  ottPrimaryLabel,
} from "@/lib/resolvers/ott-deep-links";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

export { isOttUrl } from "@/lib/resolvers/ott-deep-links";

const MAX_ACTIONS = 5;

function resolveOttHint(rawUrl: string, title: string | null) {
  const fromTitle = title?.trim();
  if (fromTitle && !isWeakTitleHint(fromTitle)) {
    return fromTitle;
  }

  return parseTitleFromUrl(rawUrl);
}

function buildOttActions(
  url: string,
  domain: string,
  title: string | null,
  hint: string | null
) {
  const brand = detectOttBrand(url, domain);
  const copyText = hint?.trim() || title?.trim() || null;

  const primary = createOpenAction({
    label: ottPrimaryLabel(brand),
    href: url,
    icon: "youtube",
    copyText,
  });

  const secondary: LinkActionItem[] = [];
  const appHref = buildOttAppHref(url, brand);

  if (appHref) {
    secondary.push(
      createOpenAction({
        label: ottAppLabel(brand),
        href: appHref,
        icon: "youtube",
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

export const ottEnricher: Enricher = {
  id: "ott-v1",

  async enrich(rawUrl: string, _context: EnricherContext): Promise<EnrichedLink> {
    const parsed = normalizeInputUrl(rawUrl);
    const metadata = await fetchPageMetadata(parsed.href);
    const urlHint = resolveOttHint(parsed.href, metadata.title);
    const normalized = withDomainFallback(metadata, {
      title: urlHint ?? metadata.title,
      image: metadata.image,
      description: metadata.description,
    });

    const title = urlHint ?? normalized.title;
    const hint = resolveOttHint(parsed.href, title);

    return {
      url: normalized.url,
      domain: normalized.domain,
      title,
      image: normalized.image,
      description: normalized.description,
      actions: buildOttActions(normalized.url, normalized.domain, title, hint),
      enricher_id: "ott-v1",
      source_type: "ott",
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
