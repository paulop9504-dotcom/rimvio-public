import { hasInstalledApp, isCommuteHour } from "@/lib/enrichers/context";
import type { EnricherContext } from "@/lib/enrichers/types";
import { parseMapTitleFromUrl, parseBestTitleFromUrl, parseCommerceHintFromUrl, parseAddressTitleFromUrl } from "@/lib/enrichers/url-intelligence";
import { appendExtensionActions } from "@/lib/actions/append-extension-actions";
import { MAX_LINK_ACTIONS } from "@/lib/actions/constants";
import { pickEnrichedPhone } from "@/lib/enrichers/extract-phone";
import {
  buildGoogleEarthAction,
  buildGoogleMapsOpenAction,
  buildGoogleMapsNavigateHref,
  buildKakaoMapAction,
  buildKakaoMapSearchAction,
  buildYouTubeAppHref,
  isPlaceRelatedUrl,
} from "@/lib/resolvers/deep-links";
import {
  isDomesticMapAction,
  isDomesticMapPlace,
  parseGoogleMapCoords,
} from "@/lib/resolvers/place-map-region";
import type { LinkActionItem } from "@/types/database";

const MAX_ACTIONS = MAX_LINK_ACTIONS;

const MAP_NAVI_PATTERN =
  /map|navi|transit|subway|metro|direction|kakaomap|map\.kakao|map\.naver|google\.com\/maps/i;

export function isMapOrNaviAction(action: LinkActionItem) {
  const target = `${action.href ?? ""} ${action.label}`;
  return MAP_NAVI_PATTERN.test(target);
}

function readCopyTextFromActions(actions: LinkActionItem[]): string | null {
  for (const action of actions) {
    const value = action.payload?.copyText;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function dedupeActions(actions: LinkActionItem[]) {
  const seen = new Set<string>();
  const next: LinkActionItem[] = [];

  for (const action of actions) {
    const key = `${action.label}|${action.href ?? ""}|${action.kind}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    next.push(action);
  }

  return next;
}

function maybePrependNavigateAction(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string,
  copyText: string | null
) {
  if (!isCommuteHour(context.hour) && context.locationCategory !== "commute") {
    return actions;
  }

  if (!isPlaceRelatedUrl(sourceUrl)) {
    return actions;
  }

  const navigateHref = buildGoogleMapsNavigateHref(sourceUrl);
  const hasNavigate = actions.some(
    (action) => action.href === navigateHref || action.label.includes("길찾기")
  );

  if (hasNavigate) {
    return actions;
  }

  const navigateAction: LinkActionItem = {
    id: crypto.randomUUID(),
    kind: "open",
    label: "🚗 길찾기",
    href: navigateHref,
    payload: {
      icon: "map",
      contextBoost: "commute",
      ...(copyText ? { copyText } : {}),
    },
  };

  return [navigateAction, ...actions];
}

function maybePrependInternationalMapActions(
  actions: LinkActionItem[],
  sourceUrl: string,
  copyText: string | null,
  title?: string | null
) {
  if (
    !isPlaceRelatedUrl(sourceUrl) ||
    isDomesticMapPlace({
      sourceUrl,
      title,
      placeName: copyText,
    })
  ) {
    return actions;
  }

  const coords = parseGoogleMapCoords(sourceUrl);
  const googlePrimary = buildGoogleMapsOpenAction(sourceUrl, copyText);
  const googleEarth =
    copyText || coords
      ? buildGoogleEarthAction(copyText ?? "place", coords)
      : null;

  const filtered = actions.filter((action) => !isDomesticMapAction(action));
  const hasGooglePrimary = filtered.some((action) =>
    /google\.com\/maps|maps\.google|earth\.google/i.test(action.href ?? "")
  );

  return dedupeActions([
    ...(hasGooglePrimary ? [] : [googlePrimary]),
    ...(googleEarth ? [googleEarth] : []),
    ...filtered,
  ]);
}

function maybePrependYouTubeAppAction(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string,
  copyText: string | null
) {
  if (!hasInstalledApp(context, "youtube")) {
    return actions;
  }

  const appHref = buildYouTubeAppHref(sourceUrl);
  if (!appHref) {
    return actions;
  }

  const hasAppAction = actions.some((action) => action.href === appHref);
  if (hasAppAction) {
    return actions;
  }

  const appAction: LinkActionItem = {
    id: crypto.randomUUID(),
    kind: "open",
    label: "📱 YouTube 앱으로",
    href: appHref,
    payload: {
      icon: "youtube",
      contextBoost: "installed-app",
      ...(copyText ? { copyText } : {}),
    },
  };

  return [
    appAction,
    ...actions.filter((action) => action.href !== appHref),
  ];
}

/**
 * Final action pass: installedApps deep links + commute navigation boost.
 */
export function resolveActions(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string,
  meta?: {
    title?: string | null;
    description?: string | null;
    phone?: string | null;
  }
): LinkActionItem[] {
  let next = [...actions];
  const copyText =
    readCopyTextFromActions(next) ??
    parseAddressTitleFromUrl(sourceUrl) ??
    parseMapTitleFromUrl(sourceUrl);

  if (
    hasInstalledApp(context, "kakaomap") &&
    isPlaceRelatedUrl(sourceUrl) &&
    isDomesticMapPlace({
      sourceUrl,
      title: meta?.title,
      placeName: copyText,
    })
  ) {
    const kakaoAction = buildKakaoMapAction(sourceUrl, copyText);
    next = [
      kakaoAction,
      ...next.filter(
        (action) =>
          action.href !== kakaoAction.href &&
          action.payload?.icon !== "kakaomap"
      ),
    ];

    if (copyText) {
      const searchAction = buildKakaoMapSearchAction(copyText);
      const hasSearch = next.some(
        (action) => action.href === searchAction.href
      );
      if (!hasSearch) {
        next = [
          kakaoAction,
          searchAction,
          ...next.filter(
            (action) =>
              action.href !== kakaoAction.href &&
              action.href !== searchAction.href
          ),
        ];
      }
    }
  } else {
    next = maybePrependInternationalMapActions(
      next,
      sourceUrl,
      copyText,
      meta?.title
    );
  }

  next = maybePrependNavigateAction(next, context, sourceUrl, copyText);
  next = maybePrependYouTubeAppAction(next, context, sourceUrl, copyText);

  let domain = "link";
  try {
    domain = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    // keep default
  }

  const titleHint =
    copyText ??
    parseAddressTitleFromUrl(sourceUrl) ??
    parseMapTitleFromUrl(sourceUrl) ??
    parseCommerceHintFromUrl(sourceUrl, domain) ??
    parseBestTitleFromUrl(sourceUrl, domain);

  next = appendExtensionActions(next, {
    sourceUrl,
    domain,
    title: titleHint,
    description: meta?.description,
    phone:
      meta?.phone ??
      pickEnrichedPhone({
        title: titleHint,
        description: meta?.description,
        sourceUrl,
      }),
    suiteWeights: context.suiteWeights,
    pinnedSuites: context.pinnedSuites,
    hour: context.hour,
    locationCategory: context.locationCategory,
    routing: context.routing,
  });

  if (next.length === 0) {
    next = [
      {
        id: crypto.randomUUID(),
        kind: "open",
        label: "원본 열기",
        href: sourceUrl,
        payload: {
          icon: "external-link",
          ...(copyText ? { copyText } : {}),
        },
      },
    ];
  }

  return dedupeActions(next).slice(0, MAX_ACTIONS);
}

export { isPlaceRelatedUrl, buildKakaoMapAction } from "@/lib/resolvers/deep-links";
