import { createOpenAction } from "@/lib/enrichers/action-factory";
import { resolveCaptureRemoteFromIntent } from "@/lib/capture/build-capture-actions";
import { resolveInferredCaptureIntent } from "@/lib/capture/resolve-inferred-query";
import type { CaptureIntent } from "@/lib/capture/capture-intent-types";
import type { CaptureVisionResult } from "@/lib/capture/inferred-intent-types";
import { buildCompareQuery } from "@/lib/commerce/compare-query";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import { readBurstSessionFromTrajectory } from "@/lib/intent/burst-session";
import { attachKernelSnapshot } from "@/lib/intent/kernel-snapshot";
import { readSaveTrajectory } from "@/lib/intent/save-trajectory-client";
import { buildMarketCompareActions } from "@/lib/markets/build-compare-actions";
import { looksLikeTravelIntent } from "@/lib/markets/travel-intent";
import {
  buildKakaoPaySendAction,
  buildTossSendAction,
} from "@/lib/remote/payment-links";
import {
  detectClipboardIntent,
  type ClipboardPaymentIntent,
} from "@/lib/remote/detect-input-intent";
import {
  buildGoogleEarthAction,
  buildGoogleMapsSearchHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import { isDomesticMapPlace, parseGoogleMapCoords } from "@/lib/resolvers/place-map-region";
import { KAKAO_T_APP_OPEN } from "@/lib/resolvers/kakao-taxi-deep-links";
import { shouldShowTrueCostReceipt } from "@/hooks/use-true-cost-receipt";
import {
  resolveLocateRemoteFromResult,
  resolveLocateRemoteLoading,
} from "@/lib/locate/resolve-locate-remote";
import type { LocateActionResult } from "@/lib/locate/types";
import type { LinkActionItem, LinkRow } from "@/types/database";

export type ContextRemotePackId =
  | "payment_send"
  | "commerce_compare"
  | "mobility"
  | "food_delivery"
  | "menu_food"
  | "product"
  | "address"
  | "business_card"
  | "receipt"
  | "travel_booking"
  | "ticket"
  | "foreign_sign"
  | "parking"
  | "wifi_qr"
  | "medicine"
  | "place"
  | "capture_burst"
  | "idle";

export type ContextRemoteState = {
  visible: boolean;
  expanded: boolean;
  confidence: number;
  packId: ContextRemotePackId;
  signalLine: string;
  primary: LinkActionItem | null;
  secondary: LinkActionItem[];
};

const PRIMARY_CONFIDENCE = 0.78;
const VISIBLE_CONFIDENCE = 0.55;

function paymentActions(intent: ClipboardPaymentIntent): LinkActionItem[] {
  const toss = buildTossSendAction(intent.accountDisplay);
  const kakaoPay = buildKakaoPaySendAction(intent.accountDisplay);

  return [
    createOpenAction({
      label: "💸 토스 송금",
      href: toss.href,
      icon: "link",
      copyText: toss.copyText,
      fallbackHref: toss.fallbackHref,
    }),
    createOpenAction({
      label: "💛 카카오페이 송금",
      href: kakaoPay.href,
      icon: "link",
      copyText: kakaoPay.copyText,
      fallbackHref: kakaoPay.fallbackHref,
    }),
    createOpenAction({
      label: "📋 계좌 복사",
      href: "#copy-account",
      icon: "copy",
      copyText: intent.accountDisplay,
    }),
  ];
}

function commerceActions(link: LinkRow): LinkActionItem[] {
  const query =
    buildCompareQuery(link.title, link.domain) ??
    link.title?.trim() ??
    link.domain;

  const compare = buildMarketCompareActions(
    {
      sourceUrl: link.original_url,
      domain: link.domain,
      title: link.title,
      appLocale: "ko",
      linkCategory: link.category,
      sourceType: link.source_type,
    },
    { maxActions: 3, excludeDestinationIds: ["naver_shopping"] }
  );

  const actions = [...compare];

  if (shouldShowTrueCostReceipt(link)) {
    actions.push(
      createOpenAction({
        label: "💸 True Cost · 기회비용",
        href: "#true-cost-receipt",
        icon: "sparkles",
        copyText: query,
      })
    );
  }

  return actions;
}

function mobilityActions(link: LinkRow): LinkActionItem[] {
  const query =
    link.title?.trim() ||
    buildCompareQuery(link.title, link.domain) ||
    "목적지";

  if (
    !isDomesticMapPlace({
      sourceUrl: link.original_url,
      title: link.title,
      placeName: query,
    })
  ) {
    const coords = parseGoogleMapCoords(link.original_url);
    const mapsHref = /google\.com\/maps/i.test(link.original_url)
      ? link.original_url
      : buildGoogleMapsSearchHref(query);

    return [
      createOpenAction({
        label: "🗺 Google 지도",
        href: mapsHref,
        icon: "map",
        copyText: query,
      }),
      buildGoogleEarthAction(query, coords),
      createOpenAction({
        label: "📅 캐치테이블",
        href: `https://app.catchtable.co.kr/ct/search/total?query=${encodeURIComponent(query)}`,
        icon: "link",
        copyText: query,
      }),
    ];
  }

  return [
    createOpenAction({
      label: "🚕 카카오T 호출",
      href: KAKAO_T_APP_OPEN,
      icon: "map",
      copyText: query,
    }),
    createOpenAction({
      label: "🗺 네이버 지도 길찾기",
      href: buildNaverMapSearchWebHref(query),
      icon: "map",
      copyText: query,
      fallbackHref: buildGoogleMapsSearchHref(query),
    }),
    createOpenAction({
      label: "📅 캐치테이블",
      href: `https://app.catchtable.co.kr/ct/search/total?query=${encodeURIComponent(query)}`,
      icon: "link",
      copyText: query,
    }),
  ];
}

function foodActions(link: LinkRow): LinkActionItem[] {
  const query = link.title?.trim() || "배달";

  return [
    createOpenAction({
      label: "🍔 배민 바로가기",
      href: "https://www.baemin.com/",
      icon: "link",
      copyText: query,
    }),
    createOpenAction({
      label: "🍽 쿠팡이츠",
      href: "https://www.coupang.com/eats",
      icon: "link",
      copyText: query,
    }),
  ];
}

function signalForPayment(
  intent: ClipboardPaymentIntent,
  source: "clipboard" | "capture" = "clipboard"
) {
  const bank = intent.bankHint ? `${intent.bankHint} · ` : "";
  if (source === "capture") {
    return `📷 사진에서 ${bank}계좌번호 감지 — 송금 준비됐어요`;
  }
  return `📋 클립보드에서 ${bank}계좌번호 감지 — 송금 준비됐어요`;
}

function signalForLink(input: {
  link: LinkRow;
  isBurst: boolean;
  burstCount: number;
  mode: string;
  hour: number;
}) {
  const { link, isBurst, burstCount, mode, hour } = input;

  if (isBurst && link.category === "shopping") {
    return `🔥 ${burstCount}개 연속 저장 — 가격 비교 중`;
  }

  if (looksLikeTravelIntent(link)) {
    return `📍 ${link.title?.trim() || "여행"} · 지도에서 열기`;
  }

  if (link.category === "shopping" || isCommerceDomain(link.domain)) {
    if (mode === "comparison") {
      return `⚖️ 비교 중 — 시세 확인부터`;
    }
    if (hour >= 22 || hour < 6) {
      return `🌙 늦은 시간 — 구매 전 한번 더 확인`;
    }
    return `🛍 ${link.title?.trim() || "쇼핑"} · 시세·비용 확인`;
  }

  if (/배민|배달|맛집|먹방|food|baemin/i.test(`${link.title} ${link.domain}`)) {
    return `🍜 배달·예약 바로 열기`;
  }

  if (isBurst) {
    return `⚡ ${burstCount}개 저장 — 바로 실행할 액션`;
  }

  return `✨ 바로 실행할 액션`;
}

function packFromLink(link: LinkRow): ContextRemotePackId {
  if (looksLikeTravelIntent(link)) {
    return "mobility";
  }

  if (
    link.category === "shopping" ||
    isCommerceDomain(link.domain) ||
    link.source_type === "commerce" ||
    link.source_type === "screenshot" && link.category === "shopping"
  ) {
    return "commerce_compare";
  }

  if (/배민|배달|맛집|baemin|coupang\.com\/eats|yogiyo/i.test(`${link.title} ${link.domain}`)) {
    return "food_delivery";
  }

  if (link.category === "food" || link.source_type === "screenshot" && /menu|맛집|카페|배민/i.test(link.title ?? "")) {
    return "food_delivery";
  }

  return "idle";
}

function confidenceFor(input: {
  clipboardPayment: ClipboardPaymentIntent | null;
  packId: ContextRemotePackId;
  isBurst: boolean;
  mode: string;
}) {
  if (input.clipboardPayment) {
    return 0.94;
  }

  switch (input.packId) {
    case "commerce_compare":
      return input.isBurst || input.mode === "comparison" ? 0.88 : 0.8;
    case "mobility":
      return 0.84;
    case "food_delivery":
      return 0.76;
    default:
      return 0.45;
  }
}

export function resolveContextRemote(input: {
  clipboardText?: string | null;
  capturePaymentIntent?: ClipboardPaymentIntent | null;
  captureIntent?: CaptureIntent | null;
  captureVision?: CaptureVisionResult | null;
  locateResult?: LocateActionResult | null;
  locateLoading?: boolean;
  link?: LinkRow | null;
  hour?: number;
  now?: number;
}): ContextRemoteState {
  const now = input.now ?? Date.now();
  const hour = input.hour ?? new Date(now).getHours();
  const link = input.link ?? null;
  const clipboard = detectClipboardIntent(input.clipboardText ?? null);
  const clipboardPayment =
    clipboard?.kind === "payment_send" ? clipboard : null;
  const capturePayment = input.capturePaymentIntent ?? null;
  const paymentIntent = capturePayment ?? clipboardPayment;
  const paymentSource: "clipboard" | "capture" | null = capturePayment
    ? "capture"
    : clipboardPayment
      ? "clipboard"
      : null;

  const trajectory = readSaveTrajectory();
  const burst = readBurstSessionFromTrajectory(trajectory, now);
  const snapshot = attachKernelSnapshot({
    saveHistory: trajectory,
    link,
    now,
  });

  const burstCount = burst.burst_count;

  if (input.locateLoading) {
    return resolveLocateRemoteLoading();
  }

  if (input.locateResult) {
    return resolveLocateRemoteFromResult(input.locateResult);
  }

  if (input.captureIntent) {
    const inferred = resolveInferredCaptureIntent({
      intent: input.captureIntent,
      captureVision: input.captureVision,
    });
    const captureRemote = resolveCaptureRemoteFromIntent(inferred);
    const visible = captureRemote.confidence >= VISIBLE_CONFIDENCE;

    return {
      visible,
      expanded: visible && captureRemote.confidence >= PRIMARY_CONFIDENCE,
      confidence: captureRemote.confidence,
      packId: captureRemote.packId as ContextRemotePackId,
      signalLine: captureRemote.signalLine,
      primary: captureRemote.primary,
      secondary: captureRemote.secondary,
    };
  }

  if (paymentIntent && paymentSource) {
    const actions = paymentActions(paymentIntent);
    const confidence = confidenceFor({
      clipboardPayment: paymentIntent,
      packId: "payment_send",
      isBurst: burst.is_burst_session,
      mode: snapshot.interaction_mode,
    });

    return {
      visible: true,
      expanded: confidence >= PRIMARY_CONFIDENCE,
      confidence,
      packId: "payment_send",
      signalLine: signalForPayment(paymentIntent, paymentSource),
      primary: actions[0] ?? null,
      secondary: actions.slice(1),
    };
  }

  if (!link) {
    return {
      visible: false,
      expanded: false,
      confidence: 0,
      packId: "idle",
      signalLine: "",
      primary: null,
      secondary: [],
    };
  }

  const packId = packFromLink(link);
  if (packId === "idle") {
    return {
      visible: burst.is_burst_session,
      expanded: false,
      confidence: burst.is_burst_session ? 0.6 : 0,
      packId: "idle",
      signalLine: burst.is_burst_session
        ? signalForLink({
            link,
            isBurst: true,
            burstCount: Math.max(burstCount, 5),
            mode: snapshot.interaction_mode,
            hour,
          })
        : "",
      primary: null,
      secondary: [],
    };
  }

  const actions =
    packId === "commerce_compare"
      ? commerceActions(link)
      : packId === "mobility"
        ? mobilityActions(link)
        : foodActions(link);

  const confidence = confidenceFor({
    clipboardPayment: null,
    packId,
    isBurst: burst.is_burst_session,
    mode: snapshot.interaction_mode,
  });

  const visible = confidence >= VISIBLE_CONFIDENCE || burst.is_burst_session;

  return {
    visible,
    expanded: visible && confidence >= PRIMARY_CONFIDENCE,
    confidence,
    packId,
    signalLine: signalForLink({
      link,
      isBurst: burst.is_burst_session,
      burstCount: Math.max(burstCount, burst.is_burst_session ? 5 : burstCount),
      mode: snapshot.interaction_mode,
      hour,
    }),
    primary: actions[0] ?? null,
    secondary: actions.slice(1, 4),
  };
}
