import { isCommuteHour } from "@/lib/enrichers/context";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import {
  fetchPageMetadata,
  normalizeInputUrl,
  withDomainFallback,
} from "@/lib/enrichers/fetch-page-metadata";
import {
  buildGoogleEarthAction,
  buildGoogleMapsNavigateHref,
  buildKakaoMapSearchAction,
  buildNaverMapSearchAction,
} from "@/lib/resolvers/deep-links";
import { isDomesticMapPlace, parseGoogleMapCoords } from "@/lib/resolvers/place-map-region";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";
import { parseMapTitleFromUrl } from "@/lib/enrichers/url-intelligence";
import { openOriginalLabel } from "@/lib/copy/human-ko";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

const MAX_ACTIONS = 5;

const MAP_HOST_PATTERN =
  /^(map\.naver\.com|map\.kakao\.com|maps\.google\.com|naver\.me)$/i;

export function isMapDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");
  return MAP_HOST_PATTERN.test(normalized);
}

export function isMapUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (isMapDomain(host)) {
      return true;
    }

    return host === "google.com" && parsed.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}

function mapDomainLabel(host: string) {
  if (/naver/i.test(host)) {
    return "map.naver.com";
  }

  if (/kakao/i.test(host)) {
    return "map.kakao.com";
  }

  if (/google/i.test(host)) {
    return "google.com/maps";
  }

  return host.replace(/^www\./, "");
}

function buildMapActions(
  url: string,
  context: EnricherContext,
  placeName: string | null
) {
  const preferNavigate =
    isCommuteHour(context.hour) || context.locationCategory === "commute";
  const place = placeName?.trim() || null;
  const domestic =
    !place ||
    isDomesticMapPlace({
      sourceUrl: url,
      title: place,
      placeName: place,
    });

  const primary = createOpenAction({
    label: preferNavigate
      ? "🚗 길찾기"
      : domestic
        ? "📍 지도 열기"
        : "Google 지도에서 열기",
    href: preferNavigate ? buildGoogleMapsNavigateHref(url) : url,
    icon: "map",
    copyText: place,
    contextBoost: preferNavigate ? "commute" : undefined,
  });

  const secondary: LinkActionItem[] = [];

  if (place && domestic) {
    secondary.push(
      createOpenAction({
        label: `🚕 카카오T · ${place.slice(0, 12)}`,
        href: KAKAO_T_APP_OPEN,
        icon: "taxi",
        copyText: place,
      }),
      buildKakaoMapSearchAction(place),
      buildNaverMapSearchAction(place)
    );
  } else if (place && !domestic) {
    secondary.push(
      buildGoogleEarthAction(place, parseGoogleMapCoords(url))
    );
  }

  if (preferNavigate) {
    secondary.push(
      createOpenAction({
        label: "📍 지도 열기",
        href: url,
        icon: "map",
        copyText: place,
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

export const mapEnricher: Enricher = {
  id: "map-v1",

  async enrich(
    rawUrl: string,
    context: EnricherContext
  ): Promise<EnrichedLink> {
    const parsed = normalizeInputUrl(rawUrl);
    const metadata = await fetchPageMetadata(parsed.href);
    const urlTitle = parseMapTitleFromUrl(parsed.href);
    const normalized = withDomainFallback(metadata, {
      title: metadata.title ?? urlTitle,
      image: metadata.image,
      description: metadata.description,
    });

    const title =
      normalized.fallback.titleFromDomain && urlTitle
        ? urlTitle
        : normalized.title ?? urlTitle;
    const hasRealTitle = Boolean(
      metadata.title?.trim() || urlTitle?.trim()
    );

    const actions = buildMapActions(
      normalized.url,
      context,
      title ?? urlTitle
    );
    const domain = mapDomainLabel(parsed.hostname);

    return {
      url: normalized.url,
      domain,
      title,
      image: normalized.image,
      description: normalized.description,
      actions,
      enricher_id: "map-v1",
      source_type: "map",
      fallback: {
        ...normalized.fallback,
        titleFromDomain: !hasRealTitle,
      },
    };
  },
};
