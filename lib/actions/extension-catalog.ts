import { createOpenAction } from "@/lib/enrichers/action-factory";
import { buildCompareQuery } from "@/lib/commerce/compare-query";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import { isGitHubDomain } from "@/lib/enrichers/github";
import { isMapUrl } from "@/lib/enrichers/map";
import { isYouTubeDomain } from "@/lib/enrichers/youtube-url";
import { isDeliveryUrl } from "@/lib/resolvers/delivery-deep-links";
import { isNaverContentUrl, detectNaverContentKind } from "@/lib/resolvers/naver-deep-links";
import { isOttUrl } from "@/lib/resolvers/ott-deep-links";
import { isKakaoOpenChatUrl } from "@/lib/enrichers/kakao";
import {
  aiPromptContextFromExtension,
  buildContextualSummaryPrompt,
} from "@/lib/actions/ai-prompt-context";
import {
  buildCatchtableSearchHref,
  buildChatGptPromptHref,
  buildGoogleSearchHref,
  buildGoogleSiteImageSearchHref,
  buildPageTranslateHref,
  buildNaverBlogSearchHref,
  buildNaverShoppingSearchHref,
  buildNaverWebSearchHref,
  buildPerplexitySearchHref,
  buildQrCodeHref,
} from "@/lib/actions/search-urls";
import {
  buildGoogleMapsDirectionHref,
  buildGoogleMapsNavigateHref,
} from "@/lib/resolvers/deep-links";
import type { LinkActionItem, LinkRow } from "@/types/database";
import type { LocationCategory, SuiteWeights } from "@/lib/enrichers/types";
import type { AppLocale } from "@/lib/i18n/types";
import { localeToTranslateTarget } from "@/lib/i18n/detect-locale";
import { createReadAloudAction } from "@/lib/actions/read-aloud-action";
import { buildMarketCompareActions } from "@/lib/markets/build-compare-actions";
import type { RouterResult } from "@/lib/routing/intelligent-router";
import type { SmartSuite } from "@/lib/actions/smart-suite-types";

export type ExtensionProfile =
  | "commerce"
  | "media"
  | "location"
  | "dev"
  | "social"
  | "delivery"
  | "generic";

export type ExtensionContext = {
  sourceUrl: string;
  domain: string;
  title: string | null;
  description?: string | null;
  phone?: string | null;
  suiteWeights?: SuiteWeights;
  pinnedSuites?: SmartSuite[];
  hour?: number;
  locationCategory?: LocationCategory;
  routing?: RouterResult;
  appLocale?: AppLocale;
  linkCategory?: LinkRow["category"];
  sourceType?: LinkRow["source_type"];
};

function queryFromContext(ctx: ExtensionContext) {
  return buildCompareQuery(ctx.title, ctx.domain);
}

function buildAiSummaryAction(ctx: ExtensionContext) {
  const prompt = buildContextualSummaryPrompt(
    aiPromptContextFromExtension(ctx),
    { task: "summary_only" }
  );

  return createOpenAction({
    label: "✨ 3줄 요약",
    href: buildChatGptPromptHref(prompt),
    icon: "sparkles",
    copyText: prompt,
  });
}

function buildAiQuestionAction(ctx: ExtensionContext) {
  const base = buildContextualSummaryPrompt(aiPromptContextFromExtension(ctx), {
    task: "summary_only",
  });
  const prompt = `${base}\n\n위 맥락을 바탕으로, 사용자 질문에 맞춰 답해 주세요.`;

  return createOpenAction({
    label: "🤖 AI에게 물어보기",
    href: buildPerplexitySearchHref(prompt),
    icon: "sparkles",
    copyText: prompt,
  });
}

function buildTranslateAction(ctx: ExtensionContext) {
  const locale = ctx.appLocale ?? "ko";
  return createOpenAction({
    label: "🌐 번역해서 읽기",
    href: buildPageTranslateHref(
      ctx.sourceUrl,
      localeToTranslateTarget(locale),
      locale
    ),
    icon: "link",
    copyText: ctx.sourceUrl,
  });
}

function buildQrAction(ctx: ExtensionContext) {
  return createOpenAction({
    label: "📱 QR로 폰에 보내기",
    href: buildQrCodeHref(ctx.sourceUrl),
    icon: "share",
    copyText: ctx.sourceUrl,
    fallbackHref: ctx.sourceUrl,
  });
}

function buildImageExtractAction(ctx: ExtensionContext) {
  return createOpenAction({
    label: "🖼 페이지 이미지 모아보기",
    href: buildGoogleSiteImageSearchHref(ctx.domain),
    icon: "link",
    copyText: ctx.sourceUrl,
  });
}

function buildCommerceCartHref(domain: string) {
  const host = domain.toLowerCase().replace(/^www\./, "");

  if (host.includes("coupang")) {
    return "https://cart.coupang.com/cart/view";
  }
  if (host.includes("smartstore") || host.includes("shopping.naver")) {
    return "https://shopping.naver.com/cart";
  }
  if (host.includes("11st")) {
    return "https://www.11st.co.kr/cart/CartAction.tmall";
  }
  if (host.includes("gmarket")) {
    return "https://cart.gmarket.co.kr/ko/cart";
  }
  if (host.includes("musinsa")) {
    return "https://www.musinsa.com/app/cart";
  }

  return null;
}

function isOrderOrTrackingUrl(sourceUrl: string) {
  return /order|delivery|tracking|invoice|ship|택배|배송/i.test(sourceUrl);
}

export function buildCommerceExtensionActions(ctx: ExtensionContext): LinkActionItem[] {
  const query = queryFromContext(ctx);
  if (!query) {
    return [];
  }

  const marketCompare = buildMarketCompareActions(ctx);
  const actions: LinkActionItem[] = [
    ...marketCompare,
    createOpenAction({
      label: "🎟 쿠폰 찾기",
      href: buildNaverWebSearchHref(`${query} 쿠폰`),
      icon: "link",
      copyText: query,
    }),
    createOpenAction({
      label: "⭐ 내돈내산 리뷰",
      href: buildNaverBlogSearchHref(`${query} 내돈내산`),
      icon: "link",
      copyText: query,
    }),
    createOpenAction({
      label: "⚖️ 장단점 정리",
      href: buildChatGptPromptHref(`${query} 구매 포인트와 우려점만 짧게 정리해줘`),
      icon: "sparkles",
      copyText: query,
    }),
    createOpenAction({
      label: "🔔 재입고·가격 알림",
      href: buildNaverShoppingSearchHref(`${query} 재입고 알림`),
      icon: "bell",
      copyText: query,
    }),
  ];

  const cartHref = buildCommerceCartHref(ctx.domain);
  if (cartHref) {
    actions.push(
      createOpenAction({
        label: "🛒 장바구니 열기",
        href: cartHref,
        icon: "link",
        copyText: query,
      })
    );
  }

  return actions;
}

export function buildDeliveryTrackingAction(ctx: ExtensionContext): LinkActionItem | null {
  const trackingMatch = ctx.sourceUrl.match(/\b(\d{10,14})\b/);
  const query = trackingMatch
    ? `택배조회 ${trackingMatch[1]}`
    : "택배 배송조회";

  return createOpenAction({
    label: "📦 배송 조회",
    href: buildNaverWebSearchHref(query),
    icon: "link",
    copyText: trackingMatch?.[1] ?? ctx.sourceUrl,
  });
}

export function buildMediaExtensionActions(ctx: ExtensionContext): LinkActionItem[] {
  const actions: LinkActionItem[] = [
    buildAiSummaryAction(ctx),
    buildTranslateAction(ctx),
    createReadAloudAction({
      sourceUrl: ctx.sourceUrl,
      title: ctx.title,
      label: "🔊 읽어주기 (TTS)",
    }),
  ];

  try {
    const parsed = new URL(ctx.sourceUrl);
    const playlistId = parsed.searchParams.get("list");
    if (playlistId && isYouTubeDomain(ctx.domain)) {
      actions.unshift(
        createOpenAction({
          label: "📺 재생목록·시리즈",
          href: `https://www.youtube.com/playlist?list=${playlistId}`,
          icon: "youtube",
          copyText: ctx.title ?? playlistId,
        })
      );
    }
  } catch {
    // ignore
  }

  if (ctx.title?.trim()) {
    actions.push(
      createOpenAction({
        label: "📰 관련 글 더보기",
        href: buildNaverWebSearchHref(ctx.title),
        icon: "link",
        copyText: ctx.title,
      })
    );
  }

  return actions;
}

export function buildLocationExtensionActions(ctx: ExtensionContext): LinkActionItem[] {
  const place = queryFromContext(ctx);
  const actions: LinkActionItem[] = [
    createOpenAction({
      label: "🚌 대중교통 길찾기",
      href: buildGoogleMapsDirectionHref(ctx.sourceUrl, "transit"),
      icon: "map",
      copyText: place,
    }),
    createOpenAction({
      label: "🚶 도보 길찾기",
      href: buildGoogleMapsDirectionHref(ctx.sourceUrl, "walking"),
      icon: "map",
      copyText: place,
    }),
    createOpenAction({
      label: "🚗 자차 길찾기",
      href: buildGoogleMapsNavigateHref(ctx.sourceUrl),
      icon: "map",
      copyText: place,
    }),
  ];

  if (place) {
    actions.push(
      createOpenAction({
        label: "🍽 메뉴·영업시간",
        href: buildNaverWebSearchHref(`${place} 메뉴 영업시간`),
        icon: "map",
        copyText: place,
      }),
      createOpenAction({
        label: "📅 예약 검색",
        href: buildCatchtableSearchHref(place),
        icon: "link",
        copyText: place,
      }),
      createOpenAction({
        label: "🅿️ 주차장 찾기",
        href: buildNaverWebSearchHref(`${place} 주차장`),
        icon: "map",
        copyText: place,
      })
    );
  }

  return actions;
}

export function buildDevExtensionActions(ctx: ExtensionContext): LinkActionItem[] {
  const actions: LinkActionItem[] = [
    buildAiQuestionAction(ctx),
    buildTranslateAction(ctx),
  ];

  try {
    const parsed = new URL(ctx.sourceUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (host === "github.com" && segments.length >= 2) {
      const [owner, repo] = segments;
      const base = `https://github.com/${owner}/${repo}`;

      actions.unshift(
        createOpenAction({
          label: "🧠 이슈 목록",
          href: `${base}/issues`,
          icon: "github",
          copyText: `${owner}/${repo}`,
        }),
        createOpenAction({
          label: "🔍 PR 목록",
          href: `${base}/pulls`,
          icon: "github",
          copyText: `${owner}/${repo}`,
        }),
        createOpenAction({
          label: "📚 코드 검색",
          href: `https://github.com/search?q=repo:${owner}/${repo}&type=code`,
          icon: "github",
          copyText: `${owner}/${repo}`,
        })
      );
    }

    if (/docs\.|developer\.|readthedocs|mdn|npmjs\.com/i.test(host + parsed.pathname)) {
      const docsQuery = ctx.title?.trim() || host;
      actions.push(
        createOpenAction({
          label: "📖 공식 문서 검색",
          href: buildGoogleSearchHref(`site:${host} ${docsQuery}`),
          icon: "link",
          copyText: docsQuery,
        })
      );
    }
  } catch {
    // ignore
  }

  return actions;
}

export function buildSocialExtensionActions(ctx: ExtensionContext): LinkActionItem[] {
  const actions: LinkActionItem[] = [buildQrAction(ctx)];

  if (isKakaoOpenChatUrl(ctx.sourceUrl)) {
    actions.unshift(
      createOpenAction({
        label: "💬 메시지 보내기",
        href: ctx.sourceUrl,
        icon: "link",
        copyText: ctx.sourceUrl,
      })
    );
  }

  if (ctx.title?.trim()) {
    actions.push(
      createOpenAction({
        label: "👤 프로필·관련 검색",
        href: buildNaverWebSearchHref(ctx.title),
        icon: "link",
        copyText: ctx.title,
      })
    );
  }

  return actions;
}

export function buildUniversalExtensionActions(ctx: ExtensionContext): LinkActionItem[] {
  return [buildQrAction(ctx), buildAiSummaryAction(ctx), buildImageExtractAction(ctx)];
}

export function detectExtensionProfile(ctx: ExtensionContext): ExtensionProfile {
  const { sourceUrl, domain } = ctx;

  if (isCommerceDomain(domain)) {
    return "commerce";
  }

  if (isDeliveryUrl(sourceUrl)) {
    return "delivery";
  }

  if (isMapUrl(sourceUrl) || detectNaverContentKind(sourceUrl, domain) === "place") {
    return "location";
  }

  if (isGitHubDomain(domain) || /arxiv|scholar\.google|stackoverflow|npmjs|docs\.|developer\./i.test(domain + sourceUrl)) {
    return "dev";
  }

  if (
    isYouTubeDomain(domain) ||
    isOttUrl(sourceUrl) ||
    (isNaverContentUrl(sourceUrl) && detectNaverContentKind(sourceUrl, domain) !== "place")
  ) {
    return "media";
  }

  if (isKakaoOpenChatUrl(sourceUrl) || /instagram|threads|twitter|x\.com|facebook|linkedin|telegram/i.test(domain)) {
    return "social";
  }

  return "generic";
}

export function buildExtensionActionsForProfile(
  profile: ExtensionProfile,
  ctx: ExtensionContext
): LinkActionItem[] {
  switch (profile) {
    case "commerce": {
      const commerceActions = buildCommerceExtensionActions(ctx);
      if (isOrderOrTrackingUrl(ctx.sourceUrl)) {
        const tracking = buildDeliveryTrackingAction(ctx);
        if (tracking) {
          commerceActions.push(tracking);
        }
      }
      return commerceActions;
    }
    case "delivery":
      return [buildDeliveryTrackingAction(ctx)!].filter(Boolean);
    case "media":
      return buildMediaExtensionActions(ctx);
    case "location":
      return buildLocationExtensionActions(ctx);
    case "dev":
      return buildDevExtensionActions(ctx);
    case "social":
      return buildSocialExtensionActions(ctx);
    default:
      return [
        buildAiQuestionAction(ctx),
        buildTranslateAction(ctx),
      ];
  }
}
