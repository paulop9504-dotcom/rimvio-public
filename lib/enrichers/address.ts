import { isCommuteHour } from "@/lib/enrichers/context";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import {
  fetchPageMetadata,
  normalizeInputUrl,
  withDomainFallback,
} from "@/lib/enrichers/fetch-page-metadata";
import {
  cleanAddressTitle,
  parseAddressTitleFromUrl,
} from "@/lib/enrichers/url-intelligence";
import {
  buildGoogleMapsNavigateHref,
  buildKakaoMapSearchAction,
  buildNaverMapSearchAction,
} from "@/lib/resolvers/deep-links";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

const MAX_ACTIONS = 5;

const ADDRESS_HOST_PATTERN =
  /^(dorojuso\.kr|www\.juso\.go\.kr|juso\.go\.kr)$/i;

export function isAddressDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");
  return ADDRESS_HOST_PATTERN.test(normalized) || /dorojuso\.kr$/i.test(normalized);
}

export function isAddressUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    return isAddressDomain(host);
  } catch {
    return false;
  }
}

function resolveAddressPlace(
  rawUrl: string,
  metadataTitle: string | null,
  urlTitle: string | null
) {
  return (
    cleanAddressTitle(metadataTitle) ??
    urlTitle?.trim() ??
    parseAddressTitleFromUrl(rawUrl)
  );
}

function buildAddressActions(
  url: string,
  context: EnricherContext,
  placeName: string | null
) {
  const place = placeName?.trim() || null;
  const preferNavigate =
    isCommuteHour(context.hour) || context.locationCategory === "commute";

  const primary = place
    ? buildNaverMapSearchAction(place)
    : createOpenAction({
        label: preferNavigate ? "🚗 길찾기" : "📍 지도에서 보기",
        href: preferNavigate ? buildGoogleMapsNavigateHref(url) : url,
        icon: "map",
        copyText: place,
        contextBoost: preferNavigate ? "commute" : undefined,
      });

  const secondary: LinkActionItem[] = [];

  if (place) {
    secondary.push(
      buildKakaoMapSearchAction(place),
      createOpenAction({
        label: preferNavigate ? "🚗 길찾기" : "🚗 길찾기",
        href: buildGoogleMapsNavigateHref(place),
        icon: "map",
        copyText: place,
        contextBoost: preferNavigate ? "commute" : undefined,
      }),
      createOpenAction({
        label: `📋 ${place.slice(0, 14)}${place.length > 14 ? "…" : ""} 복사`,
        href: url,
        icon: "copy",
        copyText: place,
        fallbackHref: url,
      })
    );
  }

  secondary.push(
    createOpenAction({
      label: openOriginalLabel(),
      href: url,
      icon: "external-link",
      copyText: place,
    })
  );

  return [primary, ...secondary].slice(0, MAX_ACTIONS);
}

export const addressEnricher: Enricher = {
  id: "address-v1",

  async enrich(
    rawUrl: string,
    context: EnricherContext
  ): Promise<EnrichedLink> {
    const parsed = normalizeInputUrl(rawUrl);
    const metadata = await fetchPageMetadata(parsed.href);
    const urlTitle = parseAddressTitleFromUrl(parsed.href);
    const normalized = withDomainFallback(metadata, {
      title: cleanAddressTitle(metadata.title) ?? urlTitle,
      image: metadata.image,
      description: metadata.description,
    });

    const title = resolveAddressPlace(
      normalized.url,
      normalized.title,
      urlTitle
    );
    const hasRealTitle = Boolean(title?.trim());

    const actions = buildAddressActions(normalized.url, context, title);
    const domain = parsed.hostname.replace(/^www\./, "");

    return {
      url: normalized.url,
      domain,
      title: title ?? domain,
      image: normalized.image,
      description: normalized.description,
      actions,
      enricher_id: "address-v1",
      source_type: "map",
      fallback: {
        ...normalized.fallback,
        titleFromDomain: !hasRealTitle,
      },
    };
  },
};
