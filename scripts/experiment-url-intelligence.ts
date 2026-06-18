#!/usr/bin/env npx tsx
/**
 * Zero-cost URL intelligence checks (no network).
 * Usage: npm run experiment:url
 */

import assert from "node:assert/strict";
import {
  commercePrimaryLabel,
  formatYouTubeTimestamp,
  isCommerceDomain,
  parseCommerceHintFromUrl,
  isWeakTitleHint,
  parseMapTitleFromUrl,
  parseTitleFromUrl,
  parseBestTitleFromUrl,
  parseQueryTitleHint,
  resolveBestTitle,
  parseYouTubeStartSeconds,
  isGarbledText,
} from "../lib/enrichers/url-intelligence";
import { cleanPageTitle } from "../lib/enrichers/clean-page-title";
import {
  buildCommerceAppHref,
  detectTransportKind,
  isTransportUrl,
  transportPrimaryLabel,
} from "../lib/resolvers/transport-commerce-deep-links";
import {
  buildDeliveryAppHref,
  deliveryPrimaryLabel,
  isCoupangEatsUrl,
  isDeliveryUrl,
} from "../lib/resolvers/delivery-deep-links";
import { isOttUrl, ottPrimaryLabel } from "../lib/resolvers/ott-deep-links";
import { isTicketUrl, ticketPrimaryLabel } from "../lib/resolvers/ticket-deep-links";
import {
  detectNaverContentKind,
  isNaverContentUrl,
  naverPrimaryLabel,
} from "../lib/resolvers/naver-deep-links";
import {
  parseDeliveryShopFromUrl,
  isGenericDeliverySiteTitle,
} from "../lib/enrichers/parse-delivery-shop";
import {
  aggregateActionClickStats,
  rankActionsWithAnalyticsBoost,
} from "../lib/analytics/rank-boost";
import type { BlinkAnalyticsEvent } from "../lib/analytics/types";
import { isCustomSchemeHref } from "../lib/actions/open-with-fallback";
import { normalizeYouTubeUrl, extractYouTubeVideoId } from "../lib/enrichers/youtube-url";
import { parseNaverHintFromUrl } from "../lib/resolvers/naver-deep-links";
import {
  extractUrlsFromChatText,
  parseAllManualLinkInputs,
  parseBeamSlugFromUrl,
  parseManualLinkInput,
  unwrapTranslateUrl,
} from "../lib/share/parse-share-payload";
import { isPortalHomeUrl } from "../lib/enrichers/portal-home";
import { getPortalSuite } from "../lib/enrichers/portal-action-suites";
import { rankPortalSuiteActions } from "../lib/personalization/inbox-profile";
import { rankShareDestinations } from "../lib/share/share-destinations";
import {
  isBrokenThumbnailUrl,
  resolveAmbienceThumbnail,
  shouldPreferBrandPoster,
} from "../lib/feed/link-brand-art";
import {
  isYouTubeThumbnail,
  resolveFeedVisualMode,
  resolveFeedVisualModeForLink,
} from "../lib/feed/feed-visual";
import { buildBeamShareText } from "../lib/share/beam-share-text";
import { buildBulkBeamShareText } from "../lib/share/bulk-beam-share";
import { detectLocaleFromLanguageTags } from "@/lib/i18n/detect-locale";
import { getCopy } from "@/lib/i18n/get-copy";
import { findRoomSparkLinks } from "../lib/links/room-spark-links";
import { shouldAutoTranslatePage } from "../lib/links/auto-translate-open";
import { beamSnapshotToLocalLink } from "../lib/beam/save-beam-to-pocket";
import { getShareUrgencyLine } from "../lib/share/share-urgency";
import {
  getDisplayTitleForLink,
  sanitizeLinkTitle,
} from "../lib/feed/sanitize-link-title";
import { diffRoomActivity } from "../lib/rooms/diff-room-activity";
import {
  buildCommerceExtensionActions,
  buildMediaExtensionActions,
  detectExtensionProfile,
} from "../lib/actions/extension-catalog";
import { appendExtensionActions } from "../lib/actions/append-extension-actions";
import { buildBlinkFeatureActions } from "../lib/actions/blink-feature-actions";
import { extractPriceHint } from "../lib/links/extract-price-hint";
import { findSimilarLinks } from "../lib/links/similar-links";
import {
  cleanFeedActionLabel,
  getFeedSiteLabel,
  getFeedSubtitle,
  isOpenOriginalAction,
} from "../lib/feed/feed-display";
import { buildFeedActionRotation } from "../lib/feed/action-rotation";
import { buildGoogleMapsDirectionHref } from "../lib/resolvers/deep-links";
import { createOpenAction } from "../lib/enrichers/action-factory";
import {
  detectServiceIntent,
} from "../lib/actions/service-intent";
import { buildServiceIntentActions } from "../lib/actions/service-intent-actions";
import {
  buildChronoSuiteActions,
  resolveChronoBand,
  describeChronoBand,
} from "../lib/actions/chrono-suite-actions";
import { pickFoggPrimaryAction } from "../lib/behavior/fogg";
import {
  resolveOpenLoopLevel,
} from "../lib/behavior/zeigarnik";
import {
  aggregateBurnerWeights,
  describeBurnerCoaching,
} from "../lib/behavior/burners";
import { detectSmartSuites, parseDeadlineHint } from "../lib/actions/smart-suite-actions";
import { buildSmartSuiteActions } from "../lib/actions/smart-suite-actions";
import {
  aggregateSuiteWeights,
  rankSmartSuites,
  suggestDefaultSuite,
} from "../lib/personalization/suite-profile";
import { extractPhoneFromText, toTelHref } from "../lib/enrichers/extract-phone";
import { isDirectNavigationHref } from "../lib/actions/open-with-fallback";

const cases = [
  {
    name: "Naver Map search title",
    fn: () =>
      parseMapTitleFromUrl(
        "https://map.naver.com/p/search/%EA%B0%95%EB%A6%89%20%EC%84%B8%EC%9D%B8%ED%8A%B8%EC%A1%B4%EC%A6%88"
      ),
    expect: "강릉 세인트존즈",
  },
  {
    name: "Google Maps place title",
    fn: () =>
      parseMapTitleFromUrl(
        "https://www.google.com/maps/place/Gangnam+Station/@37.497,127.027"
      ),
    expect: "Gangnam Station",
  },
  {
    name: "YouTube t=90s",
    fn: () =>
      parseYouTubeStartSeconds(
        "https://www.youtube.com/watch?v=abc123&t=90s"
      ),
    expect: 90,
  },
  {
    name: "YouTube t=1m30s",
    fn: () =>
      parseYouTubeStartSeconds("https://youtu.be/abc123?t=1m30s"),
    expect: 90,
  },
  {
    name: "format timestamp",
    fn: () => formatYouTubeTimestamp(90),
    expect: "1:30",
  },
  {
    name: "Coupang commerce domain",
    fn: () => isCommerceDomain("www.coupang.com"),
    expect: true,
  },
  {
    name: "Coupang primary label",
    fn: () => commercePrimaryLabel("coupang.com"),
    expect: "🛒 쿠팡에서 보기",
  },
  {
    name: "yo-go primary label",
    fn: () => commercePrimaryLabel("yo-go.co.kr"),
    expect: "🛒 타임딜 열기",
  },
  {
    name: "Generic slug title",
    fn: () =>
      parseTitleFromUrl("https://example.com/blog/my-cool-article-name"),
    expect: "my cool article name",
  },
  {
    name: "Query title hint",
    fn: () =>
      parseQueryTitleHint("https://example.com/search?title=Seoul%20Hotel"),
    expect: "Seoul Hotel",
  },
  {
    name: "Kakao map query title",
    fn: () =>
      parseMapTitleFromUrl("https://map.kakao.com/link/search/강남역?q=강남역"),
    expect: "강남역",
  },
  {
    name: "Naver blog hint",
    fn: () =>
      parseNaverHintFromUrl("https://blog.naver.com/traveldiary/2234567890"),
    expect: "traveldiary 블로그",
  },
  {
    name: "Resolve best title prefers clean metadata",
    fn: () =>
      resolveBestTitle({
        metadataTitle: "인터파크 티켓 | BTS WORLD TOUR",
        rawUrl: "https://ticket.interpark.com/goods/12345",
      }),
    expect: "인터파크 티켓 | BTS WORLD TOUR",
  },
  {
    name: "Clean page title strips site suffix",
    fn: () =>
      cleanPageTitle("강남역 맛집 추천 | 네이버 블로그", "네이버 블로그"),
    expect: "강남역 맛집 추천",
  },
  {
    name: "Clean page title keeps short product names",
    fn: () =>
      cleanPageTitle("무신사 스탠다드 후드 - 무신사", "무신사"),
    expect: "무신사 스탠다드 후드",
  },
  {
    name: "Resolve best title strips trailing site name",
    fn: () =>
      resolveBestTitle({
        metadataTitle: "BTS 공연 예매 | 인터파크 티켓",
        siteName: "인터파크 티켓",
        rawUrl: "https://ticket.interpark.com/goods/12345",
      }),
    expect: "BTS 공연 예매",
  },
  {
    name: "YouTube embed normalize",
    fn: () =>
      normalizeYouTubeUrl("https://www.youtube.com/embed/abc123?t=30").includes(
        "watch?v=abc123"
      ),
    expect: true,
  },
  {
    name: "YouTube video id extract",
    fn: () =>
      extractYouTubeVideoId("https://youtu.be/abc123?t=30"),
    expect: "abc123",
  },
  {
    name: "Chat text bare domain",
    fn: () =>
      extractUrlsFromChatText("여기 www.coupang.com/vp/products/1 확인")[0]?.includes(
        "coupang.com"
      ),
    expect: true,
  },
  {
    name: "GitHub repo title hint",
    fn: () =>
      parseBestTitleFromUrl("https://github.com/vercel/next.js"),
    expect: "next.js · GitHub",
  },
  {
    name: "Garbled latin-only title rejected",
    fn: () => isGarbledText("ũ Ƽ"),
    expect: true,
  },
  {
    name: "Interpark garbled title → brand label",
    fn: () =>
      sanitizeLinkTitle({
        title: "ũ Ƽ",
        original_url: "https://ticket.interpark.com/goods/57004724",
        domain: "ticket.interpark.com",
        source_type: "ticket",
      }),
    expect: "인터파크 티켓",
  },
  {
    name: "Interpark display title from saved garbage",
    fn: () =>
      getDisplayTitleForLink({
        title: "ũ Ƽ",
        original_url: "https://ticket.interpark.com/goods/57004724",
        domain: "ticket.interpark.com",
        source_type: "ticket",
        category: "media",
      }),
    expect: "인터파크 티켓",
  },
  {
    name: "Generic domain-only title hidden in UI",
    fn: () =>
      getDisplayTitleForLink({
        title: "ũ Ƽ",
        original_url: "https://example.com/x",
        domain: "example.com",
        source_type: "generic",
      }),
    expect: null,
  },
  {
    name: "Coupang app deep link",
    fn: () =>
      buildCommerceAppHref(
        "https://www.coupang.com/vp/products/123456",
        "coupang.com"
      ),
    expect: "coupang://product?productId=123456",
  },
  {
    name: "Yanolja transport URL",
    fn: () => isTransportUrl("https://www.yanolja.com/global/places/123"),
    expect: true,
  },
  {
    name: "Yanolja transport kind",
    fn: () => detectTransportKind("https://www.yanolja.com/", "yanolja.com"),
    expect: "stay",
  },
  {
    name: "Korail transport kind",
    fn: () =>
      detectTransportKind("https://www.letskorail.com/", "letskorail.com"),
    expect: "train",
  },
  {
    name: "Transport stay label",
    fn: () => transportPrimaryLabel("stay"),
    expect: "🏨 숙소 보기",
  },
  {
    name: "Baemin delivery URL",
    fn: () => isDeliveryUrl("https://www.baemin.com/shop/12345"),
    expect: true,
  },
  {
    name: "Coupang Eats URL",
    fn: () => isCoupangEatsUrl("https://www.coupang.com/eats/store/12345"),
    expect: true,
  },
  {
    name: "Coupang product not delivery",
    fn: () => isDeliveryUrl("https://www.coupang.com/vp/products/123456"),
    expect: false,
  },
  {
    name: "Baemin primary label",
    fn: () => deliveryPrimaryLabel("baemin"),
    expect: "🍔 배민에서 보기",
  },
  {
    name: "Baemin app deep link",
    fn: () =>
      buildDeliveryAppHref("https://www.baemin.com/shop/1", "baemin"),
    expect: "baemin://webview?webview_url=https%3A%2F%2Fwww.baemin.com%2Fshop%2F1",
  },
  {
    name: "Klook activity kind",
    fn: () =>
      detectTransportKind(
        "https://www.klook.com/ko/activity/12345/",
        "klook.com"
      ),
    expect: "activity",
  },
  {
    name: "Trip flight kind",
    fn: () => detectTransportKind("https://kr.trip.com/flights/", "trip.com"),
    expect: "flight",
  },
  {
    name: "Transport flight label",
    fn: () => transportPrimaryLabel("flight"),
    expect: "✈️ 항공·여행 열기",
  },
  {
    name: "Coupang Eats shop slug",
    fn: () =>
      parseDeliveryShopFromUrl(
        "https://www.coupang.com/eats/store/12345/gyochon-chicken-gangnam"
      ),
    expect: "gyochon chicken gangnam",
  },
  {
    name: "Coupang product commerce hint",
    fn: () =>
      parseCommerceHintFromUrl(
        "https://www.coupang.com/vp/products/123456",
        "coupang.com"
      ),
    expect: "쿠팡 상품",
  },
  {
    name: "Musinsa product commerce hint",
    fn: () =>
      parseCommerceHintFromUrl(
        "https://www.musinsa.com/products/123456",
        "musinsa.com"
      ),
    expect: "무신사 상품",
  },
  {
    name: "Weak numeric title hint",
    fn: () => isWeakTitleHint("123456"),
    expect: true,
  },
  {
    name: "Generic baemin site title",
    fn: () =>
      isGenericDeliverySiteTitle("배달의민족 - 배달팁 무료 배민클럽"),
    expect: true,
  },
  {
    name: "Analytics boosts Kakao T after clicks",
    fn: () => {
      const events: BlinkAnalyticsEvent[] = [
        {
          type: "action_click",
          ts: 1,
          sessionId: "s1",
          flowId: null,
          surface: "now",
          domain: "map.naver.com",
          enricher_id: "map-v1",
          source_type: "map",
          actionLabel: "🚕 카카오T · 강릉",
          actionKind: "open",
          hadCopyText: true,
          copySucceeded: true,
        },
        {
          type: "action_click",
          ts: 2,
          sessionId: "s1",
          flowId: null,
          surface: "now",
          domain: "map.naver.com",
          enricher_id: "map-v1",
          source_type: "map",
          actionLabel: "🚕 카카오T · 강릉",
          actionKind: "open",
          hadCopyText: true,
          copySucceeded: true,
        },
      ];

      const stats = aggregateActionClickStats(events);
      const ranked = rankActionsWithAnalyticsBoost(
        [
          {
            id: "1",
            kind: "open",
            label: "🗺 강릉 검색",
            href: "kakaomap://search?q=강릉",
          },
          {
            id: "2",
            kind: "open",
            label: "🚕 카카오T · 강릉",
            href: "kakaot://open",
          },
        ],
        { hour: 14, installedApps: [], locationCategory: "office" },
        "https://map.naver.com/p/search/강릉",
        stats
      );

      return ranked[0]?.label.includes("카카오T");
    },
    expect: true,
  },
  {
    name: "Netflix OTT URL",
    fn: () => isOttUrl("https://www.netflix.com/title/12345"),
    expect: true,
  },
  {
    name: "TVING primary label",
    fn: () => ottPrimaryLabel("tving"),
    expect: "▶️ TVING에서 보기",
  },
  {
    name: "Melon ticket URL",
    fn: () => isTicketUrl("https://ticket.melon.com/performance/12345"),
    expect: true,
  },
  {
    name: "Interpark ticket primary",
    fn: () => ticketPrimaryLabel("interpark"),
    expect: "🎫 인터파크 티켓 열기",
  },
  {
    name: "Naver blog URL",
    fn: () => isNaverContentUrl("https://blog.naver.com/user/123"),
    expect: true,
  },
  {
    name: "Naver map excluded",
    fn: () => isNaverContentUrl("https://map.naver.com/p/search/강릉"),
    expect: false,
  },
  {
    name: "Naver blog label",
    fn: () => naverPrimaryLabel("blog"),
    expect: "📝 블로그 글 열기",
  },
  {
    name: "Naver cafe kind",
    fn: () =>
      detectNaverContentKind("https://cafe.naver.com/myshop/123", "cafe.naver.com"),
    expect: "cafe",
  },
  {
    name: "Portal home google.com",
    fn: () => isPortalHomeUrl("https://www.google.com/"),
    expect: true,
  },
  {
    name: "Portal home naver.com",
    fn: () => isPortalHomeUrl("https://naver.com"),
    expect: true,
  },
  {
    name: "Google search not portal home",
    fn: () => isPortalHomeUrl("https://www.google.com/search?q=blink"),
    expect: false,
  },
  {
    name: "Naver map not portal home",
    fn: () => isPortalHomeUrl("https://map.naver.com/p/search/강릉"),
    expect: false,
  },
  {
    name: "YouTube watch not portal home",
    fn: () => isPortalHomeUrl("https://www.youtube.com/watch?v=abc123"),
    expect: false,
  },
  {
    name: "Portal suite travel bias",
    fn: () => {
      const suite = getPortalSuite("naver");
      if (!suite) {
        return false;
      }

      const ranked = rankPortalSuiteActions(suite.actions, {
        travel: 0.55,
        social: 0.15,
        shopping: 0.1,
        research: 0.1,
        media: 0,
        uncategorized: 0.1,
      });

      return ranked[0]?.label.includes("지도") ?? false;
    },
    expect: true,
  },
  {
    name: "Garbled mojibake title",
    fn: () => isGarbledText("������ũ Ƽ��"),
    expect: true,
  },
  {
    name: "Valid Korean title",
    fn: () => isGarbledText("인터파크 티켓"),
    expect: false,
  },
  {
    name: "Weak title rejects mojibake",
    fn: () => isWeakTitleHint("ũ Ƽ"),
    expect: true,
  },
  {
    name: "Brand poster for map static thumb",
    fn: () =>
      shouldPreferBrandPoster(
        "https://maps.google.com/maps/api/staticmap?center=36.2",
        "google.com"
      ),
    expect: true,
  },
  {
    name: "YouTube thumb not ambience (thumb mode)",
    fn: () =>
      resolveAmbienceThumbnail({
        thumbnail_url: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
        domain: "youtube.com",
      }),
    expect: null,
  },
  {
    name: "YouTube visual mode thumb",
    fn: () =>
      resolveFeedVisualMode({
        thumbnail_url: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
        domain: "youtube.com",
        original_url: "https://www.youtube.com/watch?v=abc",
      }),
    expect: "thumb",
  },
  {
    name: "Wiki visual mode poster",
    fn: () =>
      resolveFeedVisualMode({
        thumbnail_url: "https://upload.wikimedia.org/wikipedia/en/a/a4/Nyan_cat_250px.png",
        domain: "en.wikipedia.org",
        original_url: "https://en.wikipedia.org/wiki/Nyan_Cat",
      }),
    expect: "poster",
  },
  {
    name: "Persisted visual_mode wins",
    fn: () =>
      resolveFeedVisualModeForLink({
        visual_mode: "brand",
        thumbnail_url: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
        domain: "youtube.com",
        original_url: "https://www.youtube.com/watch?v=abc",
        source_type: "youtube",
      }),
    expect: "brand",
  },
  {
    name: "YouTube thumbnail detect",
    fn: () => isYouTubeThumbnail("https://i.ytimg.com/vi/abc/hqdefault.jpg"),
    expect: true,
  },
  {
    name: "Broken figma thumb rejected",
    fn: () => isBrokenThumbnailUrl("https://www.figma.com/&#47;&#47;static"),
    expect: true,
  },
  {
    name: "Share rank media → native first",
    fn: () =>
      rankShareDestinations({
        title: "Rick Astley",
        original_url: "https://youtube.com/watch?v=x",
        category: "media",
        domain: "youtube.com",
      })[0]?.id,
    expect: "native",
  },
  {
    name: "Share rank research → native first",
    fn: () =>
      rankShareDestinations({
        title: "Hello World",
        original_url: "https://github.com/octocat/Hello-World",
        category: "research",
        domain: "github.com",
      })[0]?.id,
    expect: "native",
  },
  {
    name: "Manual link bare domain",
    fn: () => parseManualLinkInput("www.coupang.com/vp/products/1").url?.includes("coupang.com"),
    expect: true,
  },
  {
    name: "Manual link accepts map path without www",
    fn: () => parseManualLinkInput("map.naver.com/p/search/강릉").url?.includes("map.naver.com"),
    expect: true,
  },
  {
    name: "Beam share URL slug parsed from vercel host",
    fn: () =>
      parseBeamSlugFromUrl(
        "https://new-project-pi-one-52.vercel.app/s/cqqya5qb1g"
      ) === "cqqya5qb1g",
    expect: true,
  },
  {
    name: "Google translate URL unwraps to original page",
    fn: () =>
      unwrapTranslateUrl(
        "https://translate.google.com/translate?sl=auto&tl=ko&u=https://www.nytimes.com/"
      ).includes("nytimes.com"),
    expect: true,
  },
  {
    name: "Multi URL paste extracts every link",
    fn: () =>
      parseAllManualLinkInputs(
        "https://www.google.com\nwww.naver.com\nyoutube.com/watch?v=abc"
      ).length >= 3,
    expect: true,
  },
  {
    name: "Manual link from chat text with youtube",
    fn: () =>
      parseManualLinkInput("여기 봐 https://www.youtube.com/watch?v=abc123").url?.includes(
        "youtube.com/watch?v=abc123"
      ),
    expect: true,
  },
  {
    name: "Beam share copy uses action label",
    fn: () =>
      buildBeamShareText({
        id: "x",
        title: "Rick Astley",
        original_url: "https://youtube.com/watch?v=x",
        category: "media",
        domain: "youtube.com",
        share_slug: "abc123",
        expires_at: null,
        actions: [{ id: "1", label: "▶ 영상 보기", kind: "open" }],
        primary_action_label: "▶ 영상 보기",
      }).includes("▶ 영상 보기"),
    expect: true,
  },
  {
    name: "Beam snapshot keeps share slug for pocket save",
    fn: () => {
      const link = beamSnapshotToLocalLink({
        slug: "abc123",
        title: "Test link",
        original_url: "https://example.com/page",
        domain: "example.com",
        category: "uncategorized",
        thumbnail_url: null,
        actions: [
          { id: "1", label: "열기", kind: "open", href: "https://example.com/page" },
        ],
        visual_mode: null,
        source_type: null,
        expires_at: null,
        primary_action_label: "열기",
        primary_action_href: "https://example.com/page",
        created_at: new Date().toISOString(),
      });

      return (
        link.share_slug === "abc123" &&
        link.original_url === "https://example.com/page"
      );
    },
    expect: true,
  },
  {
    name: "Bulk beam share text lists multiple links",
    fn: () => {
      const text = buildBulkBeamShareText([
        {
          id: "1",
          user_id: null,
          title: "YouTube",
          original_url: "https://youtube.com",
          domain: "youtube.com",
          category: "media",
          thumbnail_url: null,
          actions: [{ id: "a", label: "▶ 보기", kind: "open" }],
          share_slug: "abc",
          created_at: "",
          expires_at: null,
        },
        {
          id: "2",
          user_id: null,
          title: "Coupang",
          original_url: "https://coupang.com",
          domain: "coupang.com",
          category: "commerce",
          thumbnail_url: null,
          actions: [{ id: "b", label: "🛒 열기", kind: "open" }],
          share_slug: "def",
          created_at: "",
          expires_at: null,
        },
      ]);

      return (
        text.includes("링크 2개") &&
        text.includes("abc") &&
        text.includes("def") &&
        text.includes("▶ 보기")
      );
    },
    expect: true,
  },
  {
    name: "Room dock finds spark links for media",
    fn: () => {
      const sparks = findRoomSparkLinks(
        {
          id: "1",
          user_id: null,
          title: "TVING",
          original_url: "https://tving.com",
          domain: "tving.com",
          category: "media",
          thumbnail_url: null,
          actions: [],
          created_at: "",
          expires_at: null,
        },
        [],
        2
      );

      return sparks.length >= 1 && sparks[0].url.startsWith("http");
    },
    expect: true,
  },
  {
    name: "Travel sparks localize to Korea for domestic trips",
    fn: () => {
      const sparks = findRoomSparkLinks(
        {
          id: "1",
          user_id: null,
          title: "제주 2박3일 숙소",
          original_url: "https://www.yanolja.com/jeju",
          domain: "yanolja.com",
          category: "travel",
          thumbnail_url: null,
          actions: [],
          created_at: "",
          expires_at: null,
        },
        [],
        3
      );

      const hidden = sparks.find((spark) => spark.subtitle.includes("숨은 명소"));
      return (
        hidden?.title === "네이버 여행" &&
        hidden.subtitle.includes("한국") &&
        hidden.url.includes("naver.com")
      );
    },
    expect: true,
  },
  {
    name: "Travel sparks localize to Philippines for KR→PH trips",
    fn: () => {
      const sparks = findRoomSparkLinks(
        {
          id: "1",
          user_id: null,
          title: "보라카이 리조트 예약",
          original_url: "https://www.agoda.com/boracay",
          domain: "agoda.com",
          category: "travel",
          thumbnail_url: null,
          actions: [],
          created_at: "",
          expires_at: null,
        },
        [],
        3,
        { homeCountry: "KR" }
      );

      const hidden = sparks.find((spark) => spark.subtitle.includes("숨은 명소"));
      return (
        hidden?.title === "Guide to the Philippines" &&
        hidden.subtitle.includes("필리핀") &&
        hidden.url.includes("guidetothephilippines.ph")
      );
    },
    expect: true,
  },
  {
    name: "Travel sparks localize to US for KR→US trips",
    fn: () => {
      const sparks = findRoomSparkLinks(
        {
          id: "1",
          user_id: null,
          title: "하와이 호텔 비교",
          original_url: "https://www.booking.com/hawaii",
          domain: "booking.com",
          category: "travel",
          thumbnail_url: null,
          actions: [],
          created_at: "",
          expires_at: null,
        },
        [],
        3,
        { homeCountry: "KR" }
      );

      const hidden = sparks.find((spark) => spark.subtitle.includes("숨은 명소"));
      return (
        hidden?.title === "Roadtrippers" &&
        hidden.subtitle.includes("미국") &&
        hidden.url.includes("roadtrippers.com")
      );
    },
    expect: true,
  },
  {
    name: "Browser en locale maps to English UI copy",
    fn: () => {
      const locale = detectLocaleFromLanguageTags("en-US,en");
      const copy = getCopy(locale);
      return locale === "en" && copy.nav.feed.toLowerCase().includes("links");
    },
    expect: true,
  },
  {
    name: "Auto-translate foreign page for Korean locale",
    fn: () =>
      shouldAutoTranslatePage(
        "https://www.nytimes.com/2026/05/27/world/example.html",
        "ko"
      ),
    expect: true,
  },
  {
    name: "Share urgency within 1 hour",
    fn: () =>
      getShareUrgencyLine({
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })?.includes("1시간") ?? false,
    expect: true,
  },
  {
    name: "Room live diff remote done comment",
    fn: () =>
      diffRoomActivity(
        {
          room: { id: "r1", slug: "x", name: "X", created_at: "" },
          links: [{ id: "l1", title: "Hotel", link_status: "open" } as never],
          comments: [],
        },
        {
          room: { id: "r1", slug: "x", name: "X", created_at: "" },
          links: [{ id: "l1", title: "Hotel", link_status: "done" } as never],
          comments: [
            {
              id: "c1",
              link_id: "l1",
              kind: "done",
              message: "Done",
              author_label: "보라 번개",
              created_at: new Date().toISOString(),
            },
          ],
        },
        "민트 고스트"
      ).some((event) => event.kind === "done"),
    expect: true,
  },
  {
    name: "Custom scheme detect",
    fn: () => isCustomSchemeHref("kakaomap://search?q=강릉"),
    expect: true,
  },
  {
    name: "HTTPS not custom scheme",
    fn: () => isCustomSchemeHref("https://example.com"),
    expect: false,
  },
  {
    name: "Commerce profile detected",
    fn: () =>
      detectExtensionProfile({
        sourceUrl: "https://www.coupang.com/vp/products/123",
        domain: "coupang.com",
        title: "무선 이어폰",
      }),
    expect: "commerce",
  },
  {
    name: "Commerce lowest price action",
    fn: () =>
      buildCommerceExtensionActions({
        sourceUrl: "https://www.coupang.com/vp/products/123",
        domain: "coupang.com",
        title: "무선 이어폰",
      })[0]?.label,
    expect: "💰 최저가 비교",
  },
  {
    name: "YouTube playlist extension",
    fn: () =>
      buildMediaExtensionActions({
        sourceUrl: "https://www.youtube.com/watch?v=abc&list=PLtest",
        domain: "youtube.com",
        title: "강의 1편",
      })[0]?.label,
    expect: "📺 재생목록·시리즈",
  },
  {
    name: "Google Maps transit mode",
    fn: () =>
      buildGoogleMapsDirectionHref(
        "https://map.naver.com/p/search/강남역",
        "transit"
      ).includes("travelmode=transit"),
    expect: true,
  },
  {
    name: "Extension actions appended before fallback",
    fn: () => {
      const base = [
        createOpenAction({
          label: "🛒 쿠팡에서 보기",
          href: "https://www.coupang.com/vp/1",
          icon: "link",
        }),
        createOpenAction({
          label: "🌐 그 페이지로 가기",
          href: "https://www.coupang.com/vp/1",
          icon: "external-link",
        }),
      ];
      const merged = appendExtensionActions(base, {
        sourceUrl: "https://www.coupang.com/vp/1",
        domain: "coupang.com",
        title: "텀블러",
      });
      const fallbackIdx = merged.findIndex((a) => a.label.includes("그 페이지로 가기"));
      const priceIdx = merged.findIndex((a) => a.label.includes("최저가"));
      return priceIdx >= 0 && fallbackIdx >= 0 && priceIdx < fallbackIdx;
    },
    expect: true,
  },
  {
    name: "Feed refresh first press shows original URL action",
    fn: () => {
      const actions = [
        createOpenAction({
          label: "🛒 쿠팡에서 보기",
          href: "https://www.coupang.com/vp/1",
          icon: "link",
        }),
        createOpenAction({
          label: "🌐 그 페이지로 가기",
          href: "https://www.coupang.com/vp/1",
          icon: "external-link",
        }),
        createOpenAction({
          label: "💰 최저가 비교",
          href: "https://search.shopping.naver.com/search/all?query=텀블러",
          icon: "link",
        }),
      ];
      const rotation = buildFeedActionRotation(
        actions,
        "https://www.coupang.com/vp/1"
      );
      return (
        rotation.length >= 2 &&
        isOpenOriginalAction(rotation[1].label)
      );
    },
    expect: true,
  },
  {
    name: "Rimvio feature actions include direct share + remind",
    fn: () => {
      const labels = buildBlinkFeatureActions().map((action) => action.label);
      return labels.some((label) => label.includes("친구에게")) &&
        labels.some((label) => label.includes("나중에"));
    },
    expect: true,
  },
  {
    name: "Price hint from Korean title",
    fn: () => extractPriceHint("무선 이어폰 29,900원 특가"),
    expect: "29,900원",
  },
  {
    name: "Similar links prefer same domain",
    fn: () =>
      findSimilarLinks(
        {
          id: "a",
          user_id: null,
          original_url: "https://coupang.com/1",
          title: "A",
          thumbnail_url: null,
          domain: "coupang.com",
          category: "shopping",
          actions: [],
          created_at: new Date().toISOString(),
          expires_at: null,
        },
        [
          {
            id: "b",
            user_id: null,
            original_url: "https://coupang.com/2",
            title: "B",
            thumbnail_url: null,
            domain: "coupang.com",
            category: "shopping",
            actions: [],
            created_at: new Date().toISOString(),
            expires_at: null,
          },
          {
            id: "c",
            user_id: null,
            original_url: "https://youtube.com/x",
            title: "C",
            thumbnail_url: null,
            domain: "youtube.com",
            category: "media",
            actions: [],
            created_at: new Date().toISOString(),
            expires_at: null,
          },
        ],
        1
      )[0]?.id,
    expect: "b",
  },
  {
    name: "Feed subtitle uses brand not raw host",
    fn: () =>
      getFeedSubtitle({
        id: "1",
        user_id: null,
        original_url: "https://www.netflix.com/watch/1",
        title: "오징어 게임",
        thumbnail_url: null,
        domain: "netflix.com",
        category: "media",
        actions: [],
        created_at: new Date().toISOString(),
        expires_at: null,
      }),
    expect: "Netflix",
  },
  {
    name: "Feed site label is brand not host",
    fn: () =>
      getFeedSiteLabel({
        domain: "netflix.com",
        category: "media",
      }),
    expect: "Netflix",
  },
  {
    name: "Clean feed action label strips emoji",
    fn: () => cleanFeedActionLabel("💬 카톡 한 줄 공유"),
    expect: "카톡 한 줄 공유",
  },
  {
    name: "Beauty intent detected from title",
    fn: () =>
      detectServiceIntent({
        sourceUrl: "https://example.com/salon/gangnam",
        domain: "example.com",
        title: "강남 네일샵 예약",
      }),
    expect: "beauty_wellness",
  },
  {
    name: "CS intent detected on order URL",
    fn: () =>
      detectServiceIntent({
        sourceUrl: "https://www.coupang.com/my/order/tracking/123",
        domain: "coupang.com",
        title: "배송 문의",
      }),
    expect: "cs_support",
  },
  {
    name: "Beauty actions include phone booking and naver booking",
    fn: () => {
      const labels = buildServiceIntentActions("beauty_wellness", {
        sourceUrl: "https://hair.example.com",
        domain: "hair.example.com",
        title: "청담 헤어살롱",
        description: "전화: 02-1234-5678",
        phone: "02-1234-5678",
      }).map((action) => action.label);
      return (
        labels.some((label) => label.includes("전화 예약")) &&
        labels.some((label) => label.includes("네이버 예약")) &&
        labels.some((label) => label.includes("카톡"))
      );
    },
    expect: true,
  },
  {
    name: "Call action uses tel href",
    fn: () => {
      const actions = buildServiceIntentActions("professional", {
        sourceUrl: "https://law.example.com",
        domain: "law.example.com",
        title: "법률 상담",
        phone: "010-1234-5678",
      });
      return actions[0]?.href?.startsWith("tel:+82");
    },
    expect: true,
  },
  {
    name: "Phone extracted from labelled text",
    fn: () => extractPhoneFromText("문의 010-9876-5432"),
    expect: "010-9876-5432",
  },
  {
    name: "tel href is direct navigation",
    fn: () => isDirectNavigationHref(toTelHref("010-1234-5678")),
    expect: true,
  },
  {
    name: "Service intent actions inserted after primary",
    fn: () => {
      const merged = appendExtensionActions(
        [
          createOpenAction({
            label: "🛒 쿠팡에서 보기",
            href: "https://www.coupang.com/vp/1",
            icon: "link",
          }),
          createOpenAction({
            label: "🌐 그 페이지로 가기",
            href: "https://www.coupang.com/vp/1",
            icon: "external-link",
          }),
        ],
        {
          sourceUrl: "https://www.coupang.com/my/order/tracking/123",
          domain: "coupang.com",
          title: "배송 지연 문의",
        }
      );
      const primaryIdx = merged.findIndex((action) =>
        action.label.includes("쿠팡에서 보기")
      );
      const csIdx = merged.findIndex((action) =>
        action.label.includes("고객센터")
      );
      return primaryIdx === 0 && csIdx > 0;
    },
    expect: true,
  },
  {
    name: "Mobility intent detected from flat tire title",
    fn: () =>
      detectServiceIntent({
        sourceUrl: "https://example.com/help",
        domain: "example.com",
        title: "고속도로 타이어 펑크 견인",
      }),
    expect: "mobility_auto",
  },
  {
    name: "Education actions include trial and schedule",
    fn: () => {
      const labels = buildServiceIntentActions("education_coaching", {
        sourceUrl: "https://piano.example.com",
        domain: "piano.example.com",
        title: "강남 피아노 레슨",
      }).map((action) => action.label);
      return (
        labels.some((label) => label.includes("체험 수업")) &&
        labels.some((label) => label.includes("강사 스케줄"))
      );
    },
    expect: true,
  },
  {
    name: "Emergency utility intent detected for lost keys",
    fn: () =>
      detectServiceIntent({
        sourceUrl: "https://lock.example.com",
        domain: "lock.example.com",
        title: "도어락 열쇠 분실 긴급",
      }),
    expect: "emergency_utility",
  },
  {
    name: "Freelancer actions include portfolio and quote",
    fn: () => {
      const labels = buildServiceIntentActions("freelancer_gig", {
        sourceUrl: "https://instagram.com/snap.photo",
        domain: "instagram.com",
        title: "스냅 사진 외주",
      }).map((action) => action.label);
      return (
        labels.some((label) => label.includes("포트폴리오")) &&
        labels.some((label) => label.includes("견적"))
      );
    },
    expect: true,
  },
  {
    name: "Intellectual smart suite detected for news",
    fn: () =>
      detectSmartSuites({
        sourceUrl: "https://news.example.com/article/1",
        domain: "news.example.com",
        title: "오늘의 경제 칼럼",
      }).includes("intellectual"),
    expect: true,
  },
  {
    name: "Career smart suite detected for job posting",
    fn: () =>
      detectSmartSuites({
        sourceUrl: "https://www.wanted.co.kr/wd/123",
        domain: "wanted.co.kr",
        title: "프론트엔드 채용",
      }).includes("career"),
    expect: true,
  },
  {
    name: "Smart suite includes summary and split bill",
    fn: () => {
      const labels = buildSmartSuiteActions(
        {
          sourceUrl: "https://www.coupang.com/vp/1",
          domain: "coupang.com",
          title: "Bluetooth speaker review",
        },
        6
      ).map((action) => action.label);
      return (
        labels.some((label) => label.includes("N빵")) ||
        labels.some((label) => label.includes("요약")) ||
        labels.some((label) => label.includes("리뷰"))
      );
    },
    expect: true,
  },
  {
    name: "Deadline hint parsed from policy text",
    fn: () => parseDeadlineHint("신청 마감: 2026-05-30"),
    expect: "2026-05-30",
  },
  {
    name: "Finance suite detected for stock link",
    fn: () =>
      detectSmartSuites({
        sourceUrl: "https://finance.naver.com/item/main.naver?code=005930",
        domain: "finance.naver.com",
        title: "삼성전자 주식",
      }).includes("finance"),
    expect: true,
  },
  {
    name: "Edu suite detected for lecture PDF",
    fn: () =>
      detectSmartSuites({
        sourceUrl: "https://www.coursera.org/learn/ml",
        domain: "coursera.org",
        title: "Machine Learning lecture notes pdf",
      }).includes("edu"),
    expect: true,
  },
  {
    name: "Travel suite actions include calendar",
    fn: () => {
      const labels = buildSmartSuiteActions(
        {
          sourceUrl: "https://www.airbnb.com/rooms/123",
          domain: "airbnb.com",
          title: "제주 여행 숙소",
        },
        6
      ).map((action) => action.label);
      return labels.some((label) => label.includes("캘린더"));
    },
    expect: true,
  },
  {
    name: "Finance suite actions include sentiment",
    fn: () => {
      const labels = buildSmartSuiteActions(
        {
          sourceUrl: "https://finance.naver.com/item/main.naver?code=005930",
          domain: "finance.naver.com",
          title: "삼성전자",
        },
        6
      ).map((action) => action.label);
      return labels.some((label) => label.includes("감정"));
    },
    expect: true,
  },
  {
    name: "User finance bias becomes default suite",
    fn: () => {
      const weights = aggregateSuiteWeights([
        {
          original_url: "https://finance.naver.com/item/main.naver?code=005930",
          title: "삼성전자 주식",
          domain: "finance.naver.com",
        },
        {
          original_url: "https://www.google.com/finance/quote/TSLA:NASDAQ",
          title: "Tesla stock",
          domain: "google.com",
        },
        {
          original_url: "https://upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC",
          title: "Bitcoin crypto",
          domain: "upbit.com",
        },
        {
          original_url: "https://finance.naver.com/world/sise.naver?symbol=SPX",
          title: "S&P 500",
          domain: "finance.naver.com",
        },
      ]);
      const dominant = suggestDefaultSuite(weights);
      const ranked = rankSmartSuites([], {
        sourceUrl: "https://news.naver.com/article/1",
        domain: "news.naver.com",
        title: "오늘 증시 마감",
        suiteWeights: weights,
      });
      return dominant === "finance" && ranked[0] === "finance";
    },
    expect: true,
  },
  {
    name: "Chrono band morning start 08:00",
    fn: () => resolveChronoBand(8),
    expect: "morning_start",
  },
  {
    name: "Chrono band work active noon",
    fn: () => resolveChronoBand(12),
    expect: "work_active",
  },
  {
    name: "Chrono morning actions include todo three",
    fn: () =>
      buildChronoSuiteActions(
        {
          sourceUrl: "https://news.naver.com/",
          domain: "naver.com",
          title: "오늘 뉴스",
          hour: 8,
        },
        2
      )
        .map((action) => action.label)
        .some((label) => label.includes("할 일 3개")),
    expect: true,
  },
  {
    name: "Chrono growth actions include achievement log",
    fn: () =>
      buildChronoSuiteActions(
        {
          sourceUrl: "https://example.com/article",
          domain: "example.com",
          title: "AI 논문",
          hour: 20,
        },
        2
      )
        .map((action) => action.label)
        .some((label) => label.includes("성취")),
    expect: true,
  },
  {
    name: "Chrono describe band psyche",
    fn: () => describeChronoBand(23).need,
    expect: "생리적/휴식",
  },
  {
    name: "Fogg picks tel action first",
    fn: () =>
      pickFoggPrimaryAction([
        {
          id: "1",
          kind: "open",
          label: "AI 요약",
          href: "https://chatgpt.com/?q=hi",
        },
        {
          id: "2",
          kind: "open",
          label: "전화",
          href: "tel:0212345678",
        },
      ])?.href,
    expect: "tel:0212345678",
  },
  {
    name: "Zeigarnik level rises with age",
    fn: () => {
      const old = resolveOpenLoopLevel({
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: null,
        link_status: "open",
      });
      const fresh = resolveOpenLoopLevel({
        created_at: new Date().toISOString(),
        expires_at: null,
        link_status: "open",
      });
      return old >= 2 && fresh === 0;
    },
    expect: true,
  },
  {
    name: "Burner coaching for heavy work day",
    fn: () => {
      const weights = aggregateBurnerWeights([
        {
          original_url: "https://finance.naver.com/",
          title: "주식",
          domain: "naver.com",
          category: "research",
        },
        {
          original_url: "https://www.wanted.co.kr/",
          title: "채용",
          domain: "wanted.co.kr",
          category: "research",
        },
        {
          original_url: "https://www.coupang.com/",
          title: "쇼핑",
          domain: "coupang.com",
          category: "shopping",
        },
      ]);
      const line = describeBurnerCoaching(weights, 3, 14);
      return Boolean(line && line.includes("일"));
    },
    expect: true,
  },
];

let passed = 0;

for (const testCase of cases) {
  const result = testCase.fn();
  try {
    assert.equal(result, testCase.expect);
    console.log(`✓ ${testCase.name}`);
    passed += 1;
  } catch {
    console.error(`✗ ${testCase.name}`);
    console.error(`  expected: ${testCase.expect}`);
    console.error(`  got:      ${result}`);
    process.exitCode = 1;
  }
}

console.log(`\n${passed}/${cases.length} passed`);
