import { resolveDomainConfidence } from "@/lib/capture/capture-domain-router";
import { detectCaptureIntent } from "@/lib/capture/detect-capture-intent";
import type { CaptureIntentKind } from "@/lib/capture/capture-intent-types";
import { isFoodVision } from "@/lib/capture/classify-legacy-place-product";
import { buildTrueCostReceipt } from "@/lib/commerce/true-cost-receipt";
import { isSecondhandDomain } from "@/lib/commerce/commerce-cleaner";
import { isTechListingTitle } from "@/lib/commerce/tech-category";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import { parsePriceToWon } from "@/lib/links/extract-price-hint";
import { routeLink, type RouterInput } from "@/lib/routing/intelligent-router";
import {
  financeLossPreventionMetric,
  foodLossPreventionMetric,
  medicalLossPreventionMetric,
  otherLossPreventionMetric,
  shoppingLossPreventionMetric,
  studyLossPreventionMetric,
  type L0ValueMarketContext,
} from "@/lib/routing/l0-value-metric";
import type { VisionSnapshot } from "@/lib/vision/types";

export type RimvioL0Domain =
  | "STUDY"
  | "MEDICAL"
  | "SHOPPING"
  | "FINANCE"
  | "FOOD"
  | "OTHER";

export type RimvioL0EngineRoute =
  | "document_study"
  | "medicine"
  | "commerce_compare"
  | "receipt"
  | "true-cost"
  | "food_vision"
  | "general_ocr";

/** Strict API contract — JSON-serializable only. */
export type RimvioL0Result = {
  domain: RimvioL0Domain;
  secondary_domain: RimvioL0Domain | null;
  confidence: number;
  reason: string;
  action_suggested: string;
  value_metric: string;
  engine_route: RimvioL0EngineRoute;
  capture_kind: CaptureIntentKind | null;
};

export type RimvioL0LinkInput = {
  kind: "link";
  url: string;
  domain: string;
  title?: string | null;
  description?: string | null;
  source_type?: string | null;
  category?: string | null;
  market?: L0ValueMarketContext | null;
};

export type RimvioL0CaptureInput = {
  kind: "capture";
  text: string;
  vision?: Pick<
    VisionSnapshot,
    "bestGuessLabels" | "webEntities" | "labels" | "fashionScore"
  > | null;
  listingPrice?: number | null;
  captureKind?: CaptureIntentKind | null;
  market?: L0ValueMarketContext | null;
};

export type RimvioL0Input = RimvioL0LinkInput | RimvioL0CaptureInput;

const FINANCE_CAPTURE_KINDS = new Set<CaptureIntentKind>([
  "receipt",
  "payment_send",
  "parking",
]);
const SHOPPING_CAPTURE_KINDS = new Set<CaptureIntentKind>(["product", "url"]);
const FOOD_CAPTURE_KINDS = new Set<CaptureIntentKind>(["menu_food", "place"]);
const OTHER_CAPTURE_KINDS = new Set<CaptureIntentKind>([
  "wifi_qr",
  "business_card",
  "ticket",
  "travel_booking",
  "foreign_sign",
  "address",
]);

function clampConfidence(value: number) {
  return Math.min(1, Math.max(0, Math.round(value * 100) / 100));
}

function baseEngineRoute(kind: CaptureIntentKind | null): RimvioL0EngineRoute {
  if (!kind) {
    return "general_ocr";
  }

  switch (kind) {
    case "document_study":
      return "document_study";
    case "medicine":
      return "medicine";
    case "receipt":
    case "payment_send":
      return "receipt";
    case "menu_food":
    case "place":
      return "food_vision";
    case "product":
    case "url":
      return "commerce_compare";
    default:
      return "general_ocr";
  }
}

function shoppingEngineRoute(
  techHybrid: boolean,
  title: string,
  domain?: string | null,
  listingPrice?: number | null
): RimvioL0EngineRoute {
  if (!techHybrid) {
    return "commerce_compare";
  }

  const trueCost = buildTrueCostReceipt({
    title,
    domain,
    surfacePrice: listingPrice ?? undefined,
  });

  return trueCost.available ? "true-cost" : "commerce_compare";
}

function studyValueMetric(text: string) {
  return studyLossPreventionMetric(text);
}

function medicalValueMetric() {
  return medicalLossPreventionMetric();
}

function financeValueMetric(title: string, listingPrice?: number | null) {
  return financeLossPreventionMetric(title, listingPrice);
}

function shoppingFinanceValueMetric(
  title: string,
  domain?: string | null,
  listingPrice?: number | null,
  market?: L0ValueMarketContext | null
) {
  return shoppingLossPreventionMetric(title, domain, listingPrice, market);
}

function foodValueMetric() {
  return foodLossPreventionMetric();
}

function otherValueMetric(kind?: CaptureIntentKind | null) {
  return otherLossPreventionMetric(kind);
}

function isCommerceLink(input: RimvioL0LinkInput) {
  return (
    input.source_type === "commerce" ||
    input.category === "shopping" ||
    isCommerceDomain(input.domain) ||
    isSecondhandDomain(input.domain)
  );
}

function isTechCommerceLink(input: RimvioL0LinkInput) {
  return isCommerceLink(input) && isTechListingTitle(input.title, input.domain);
}

function resolveCaptureKind(input: RimvioL0CaptureInput) {
  if (input.captureKind !== undefined) {
    return input.captureKind;
  }

  return detectCaptureIntent({
    text: input.text,
    vision: input.vision ?? null,
  })?.kind ?? null;
}

function routeCaptureL0(input: RimvioL0CaptureInput): RimvioL0Result {
  const rawText = input.text ?? "";
  const domainCheck = resolveDomainConfidence({
    rawText,
    ocrText: rawText.replace(/\s+/g, " ").trim(),
    vision: input.vision ?? null,
  });

  const captureKind = resolveCaptureKind(input);

  if (domainCheck.domain === "STUDY") {
    return {
      domain: "STUDY",
      secondary_domain: null,
      confidence: clampConfidence(
        domainCheck.winnerTakeAll || domainCheck.forcedStudy
          ? Math.max(domainCheck.studyConfidence, 0.85)
          : domainCheck.studyConfidence
      ),
      reason: domainCheck.forcedStudy
        ? "줄글 밀도·학술 맥락 — STUDY hard rule"
        : "학술·문서 텍스트 — 의료 키워드보다 STUDY 우선",
      action_suggested: "시험용 30초 정리 · 포스트잇",
      value_metric: studyValueMetric(rawText),
      engine_route: "document_study",
      capture_kind: "document_study",
    };
  }

  if (domainCheck.domain === "MEDICAL" || captureKind === "medicine") {
    return {
      domain: "MEDICAL",
      secondary_domain: null,
      confidence: clampConfidence(Math.max(domainCheck.medicalConfidence, 0.78)),
      reason: "처방·복약 지시가 명확한 의료 캡처",
      action_suggested: "복용 요약 · 복약 포스트잇",
      value_metric: medicalValueMetric(),
      engine_route: "medicine",
      capture_kind: "medicine",
    };
  }

  const engineRoute = baseEngineRoute(captureKind);

  if (captureKind && FINANCE_CAPTURE_KINDS.has(captureKind)) {
    return {
      domain: "FINANCE",
      secondary_domain: null,
      confidence: 0.86,
      reason: "영수증·결제·주차 등 금융 수치 데이터",
      action_suggested: "지출 기록 · 결제·영수증 액션",
      value_metric: financeValueMetric(rawText, input.listingPrice),
      engine_route: engineRoute,
      capture_kind: captureKind,
    };
  }

  if (captureKind && SHOPPING_CAPTURE_KINDS.has(captureKind)) {
    const techHybrid = isTechListingTitle(rawText, null);
    return {
      domain: "SHOPPING",
      secondary_domain: techHybrid ? "FINANCE" : null,
      confidence: 0.8,
      reason: techHybrid
        ? "중고 Tech 매물 + 가격·감가 분석 가능"
        : "상품·쇼핑 캡처",
      action_suggested: techHybrid
        ? "최저가 비교 및 감가 계산"
        : "상품 검색 · 가격 비교",
      value_metric: shoppingFinanceValueMetric(
        rawText,
        null,
        input.listingPrice,
        input.market
      ),
      engine_route: shoppingEngineRoute(techHybrid, rawText, null, input.listingPrice),
      capture_kind: captureKind,
    };
  }

  if ((captureKind && FOOD_CAPTURE_KINDS.has(captureKind)) || isFoodVision(input.vision)) {
    return {
      domain: "FOOD",
      secondary_domain: null,
      confidence: 0.82,
      reason: "음식·메뉴·맛집 맥락",
      action_suggested: "맛집 검색 · 메뉴·지도",
      value_metric: foodValueMetric(),
      engine_route: "food_vision",
      capture_kind: captureKind ?? "menu_food",
    };
  }

  if (captureKind && OTHER_CAPTURE_KINDS.has(captureKind)) {
    return {
      domain: "OTHER",
      secondary_domain: null,
      confidence: 0.72,
      reason: `범용 캡처 intent(${captureKind})`,
      action_suggested: "1-Tap 유틸리티 액션",
      value_metric: otherValueMetric(captureKind),
      engine_route: engineRoute,
      capture_kind: captureKind,
    };
  }

  return {
    domain: "OTHER",
    secondary_domain: null,
    confidence: clampConfidence(domainCheck.otherConfidence || 0.45),
    reason: "특정 도메인 신호 약함 — 범용 OCR",
    action_suggested: "캡처 맥락 확인",
    value_metric: otherValueMetric(captureKind),
    engine_route: engineRoute,
    capture_kind: captureKind,
  };
}

function routeLinkL0(input: RimvioL0LinkInput): RimvioL0Result {
  const routing = routeLink({
    url: input.url,
    domain: input.domain,
    title: input.title,
    description: input.description,
    source_type: input.source_type
      ? (input.source_type as RouterInput["source_type"])
      : undefined,
  });

  if (routing.mode === "commerce_compare" || isCommerceLink(input)) {
    const techHybrid = isTechCommerceLink(input);
    const title = input.title ?? input.url;
    const listingPrice = parsePriceToWon(input.title);
    return {
      domain: "SHOPPING",
      secondary_domain: techHybrid ? "FINANCE" : null,
      confidence: clampConfidence(routing.confidence),
      reason: techHybrid
        ? "오픈마켓 Tech 매물 + 시세·감가 분석 가능"
        : "쇼핑·중고 링크",
      action_suggested: techHybrid
        ? "최저가 비교 및 감가 계산"
        : "가격 비교 · 쇼핑 검색",
      value_metric: shoppingFinanceValueMetric(
        title,
        input.domain,
        listingPrice,
        input.market
      ),
      engine_route: shoppingEngineRoute(techHybrid, title, input.domain, listingPrice),
      capture_kind: null,
    };
  }

  if (/coupang.*eats|배민|yogiyo|맛집|menu|baemin\.com/i.test(input.url)) {
    return {
      domain: "FOOD",
      secondary_domain: null,
      confidence: clampConfidence(routing.confidence),
      reason: "음식·배달·맛집 링크",
      action_suggested: "맛집·메뉴 탐색",
      value_metric: foodValueMetric(),
      engine_route: "food_vision",
      capture_kind: null,
    };
  }

  if (
    routing.winner === "research" ||
    /arxiv|scholar|wikipedia|medium\.com|brunch|tistory|blog/i.test(input.url)
  ) {
    return {
      domain: "STUDY",
      secondary_domain: null,
      confidence: clampConfidence(Math.max(routing.confidence, 0.65)),
      reason: "학습·리서치 콘텐츠 링크",
      action_suggested: "요약 · 핵심 정리",
      value_metric: studyValueMetric(input.title ?? input.description ?? ""),
      engine_route: "document_study",
      capture_kind: null,
    };
  }

  if (/receipt|영수증|bank|은행|카드|결제/i.test(`${input.title} ${input.url}`)) {
    return {
      domain: "FINANCE",
      secondary_domain: null,
      confidence: 0.75,
      reason: "금융·영수증 관련 링크",
      action_suggested: "지출·결제 기록",
      value_metric: financeValueMetric(input.title ?? "", parsePriceToWon(input.title)),
      engine_route: "receipt",
      capture_kind: null,
    };
  }

  return {
    domain: "OTHER",
    secondary_domain: null,
    confidence: clampConfidence(routing.confidence),
    reason: `링크 라우팅 ${routing.mode} (${routing.winner})`,
    action_suggested: "링크 열기 · 맥락 액션",
    value_metric: "저장한 링크 1-Tap 액션 가치",
    engine_route: "general_ocr",
    capture_kind: null,
  };
}

/**
 * Rimvio L0 orchestrator — unified domain JSON for link/capture ingress.
 * Pure read path; no truth mutation or network.
 */
export function routeRimvioL0(input: RimvioL0Input): RimvioL0Result {
  if (input.kind === "link") {
    return routeLinkL0(input);
  }

  return routeCaptureL0(input);
}

/** API-safe compact JSON string (no markdown fences). */
export function rimvioL0ResultToJson(result: RimvioL0Result): string {
  return JSON.stringify(result);
}

export function buildRimvioL0FromOcr(input: {
  text: string;
  vision?: RimvioL0CaptureInput["vision"];
  intentKind?: CaptureIntentKind | null;
  listingPrice?: number | null;
  market?: L0ValueMarketContext | null;
}): RimvioL0Result {
  return routeRimvioL0({
    kind: "capture",
    text: input.text,
    vision: input.vision ?? null,
    listingPrice: input.listingPrice ?? parsePriceToWon(input.text),
    captureKind: input.intentKind ?? null,
    market: input.market ?? null,
  });
}

export function buildRimvioL0FromLink(input: RimvioL0LinkInput): RimvioL0Result {
  return routeRimvioL0(input);
}
