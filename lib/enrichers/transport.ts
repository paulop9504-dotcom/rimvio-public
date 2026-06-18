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
  buildTransportAppHref,
  detectTransportKind,
  parseHintFromUrlPath,
  transportAppLabel,
  transportPrimaryLabel,
} from "@/lib/resolvers/transport-commerce-deep-links";
import { parseMapTitleFromUrl, parseTitleFromUrl } from "@/lib/enrichers/url-intelligence";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

export { isTransportDomain, isTransportUrl } from "@/lib/resolvers/transport-commerce-deep-links";

const MAX_ACTIONS = 5;

function resolveTransportHint(rawUrl: string, title: string | null) {
  return (
    title?.trim() ||
    parseMapTitleFromUrl(rawUrl) ||
    parseHintFromUrlPath(rawUrl) ||
    parseTitleFromUrl(rawUrl) ||
    null
  );
}

function buildTransportActions(
  url: string,
  domain: string,
  title: string | null,
  hint: string | null
) {
  const kind = detectTransportKind(url, domain);
  const copyText = hint?.trim() || title?.trim() || null;

  const primary = createOpenAction({
    label: transportPrimaryLabel(kind),
    href: url,
    icon: "transit",
    copyText,
  });

  const secondary: LinkActionItem[] = [];
  const appHref = buildTransportAppHref(url, domain, kind, copyText);

  if (appHref) {
    secondary.push(
      createOpenAction({
        label: transportAppLabel(kind, domain),
        href: appHref,
        icon: "transit",
        copyText,
        contextBoost: "installed-app",
      })
    );
  }

  if (kind === "stay" || kind === "train") {
    secondary.push(
      createOpenAction({
        label: copyText
          ? `🚕 카카오T · ${copyText.slice(0, 10)}`
          : "🚕 카카오T 열기",
        href: KAKAO_T_APP_OPEN,
        icon: "taxi",
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

export const transportEnricher: Enricher = {
  id: "transport-v1",

  async enrich(
    rawUrl: string,
    _context: EnricherContext
  ): Promise<EnrichedLink> {
    const parsed = normalizeInputUrl(rawUrl);
    const metadata = await fetchPageMetadata(parsed.href);
    const urlHint = resolveTransportHint(parsed.href, null);
    const normalized = withDomainFallback(metadata, {
      title: metadata.title ?? urlHint,
      image: metadata.image,
      description: metadata.description,
    });

    const title =
      normalized.fallback.titleFromDomain && urlHint
        ? urlHint
        : normalized.title;
    const hint = resolveTransportHint(parsed.href, title);

    const actions = buildTransportActions(
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
      enricher_id: "transport-v1",
      source_type: "transport",
      fallback: {
        ...normalized.fallback,
        titleFromDomain: !Boolean(metadata.title?.trim() || hint?.trim()),
      },
    };
  },
};
