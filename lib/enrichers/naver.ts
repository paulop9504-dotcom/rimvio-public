import {
  attachCopyToActions,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import {
  fetchPageMetadata,
  normalizeInputUrl,
  withDomainFallback,
} from "@/lib/enrichers/fetch-page-metadata";
import {
  isWeakTitleHint,
  parseBestTitleFromUrl,
  resolveBestTitle,
} from "@/lib/enrichers/url-intelligence";
import {
  buildNaverAppHref,
  detectNaverContentKind,
  naverAppLabel,
  naverPrimaryLabel,
  parseNaverHintFromUrl,
} from "@/lib/resolvers/naver-deep-links";
import { buildKakaoMapSearchAction, buildNaverMapSearchAction } from "@/lib/resolvers/deep-links";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { LinkActionItem } from "@/types/database";

export { isNaverContentUrl } from "@/lib/resolvers/naver-deep-links";

const MAX_ACTIONS = 5;

function resolveNaverHint(rawUrl: string, title: string | null) {
  return (
    resolveBestTitle({
      metadataTitle: title,
      rawUrl,
    }) ||
    parseNaverHintFromUrl(rawUrl) ||
    parseBestTitleFromUrl(rawUrl)
  );
}

function buildNaverActions(
  url: string,
  domain: string,
  title: string | null,
  hint: string | null
) {
  const kind = detectNaverContentKind(url, domain);
  const copyText = hint?.trim() || title?.trim() || null;

  const primary = createOpenAction({
    label: naverPrimaryLabel(kind),
    href: url,
    icon: "link",
    copyText,
  });

  const secondary: LinkActionItem[] = [];
  const appHref = buildNaverAppHref(url, kind);

  if (appHref) {
    secondary.push(
      kind === "place" && copyText
        ? buildNaverMapSearchAction(copyText)
        : createOpenAction({
            label: naverAppLabel(kind),
            href: appHref,
            icon: kind === "place" ? "kakaomap" : "link",
            copyText,
            contextBoost: "installed-app",
            fallbackHref: copyText
              ? `https://map.naver.com/p/search/${encodeURIComponent(copyText)}`
              : url,
          })
    );
  }

  if (kind === "place" && copyText) {
    secondary.push(buildKakaoMapSearchAction(copyText));
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

export const naverEnricher: Enricher = {
  id: "naver-v1",

  async enrich(rawUrl: string, _context: EnricherContext): Promise<EnrichedLink> {
    const parsed = normalizeInputUrl(rawUrl);
    const metadata = await fetchPageMetadata(parsed.href);
    const urlHint = resolveNaverHint(parsed.href, metadata.title);
    const normalized = withDomainFallback(metadata, {
      title: urlHint ?? metadata.title,
      image: metadata.image,
      description: metadata.description,
    });

    const title = urlHint ?? normalized.title;
    const hint = resolveNaverHint(parsed.href, title);

    return {
      url: normalized.url,
      domain: normalized.domain,
      title,
      image: normalized.image,
      description: normalized.description,
      actions: buildNaverActions(normalized.url, normalized.domain, title, hint),
      enricher_id: "naver-v1",
      source_type: "naver",
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
