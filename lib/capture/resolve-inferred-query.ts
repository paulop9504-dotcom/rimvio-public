import type { CaptureIntent } from "@/lib/capture/capture-intent-types";
import { isFoodVision } from "@/lib/capture/classify-legacy-place-product";
import {
  foodVisionSearchFallback,
  inferSignatureFoodPlace,
} from "@/lib/capture/infer-signature-food-place";
import { isGarbledCaptureOcr } from "@/lib/capture/is-garbled-capture-ocr";
import type {
  CaptureVisionResult,
  InferredCaptureIntent,
} from "@/lib/capture/inferred-intent-types";

const VISION_CONFIDENCE_THRESHOLD = 0.5;

function isTier2VisionLaw(captureVision?: CaptureVisionResult | null) {
  if (!captureVision?.search_query?.trim()) {
    return false;
  }

  if (!captureVision.type || captureVision.type === "unknown") {
    return false;
  }

  return (captureVision.confidence_score ?? 0) >= VISION_CONFIDENCE_THRESHOLD;
}
const OCR_STRUCTURED_KINDS = new Set<CaptureIntent["kind"]>([
  "payment_send",
  "receipt",
  "parking",
  "medicine",
  "address",
]);

function isGarbledOcr(text: string) {
  return isGarbledCaptureOcr(text);
}

const UTILITY_KINDS = new Set<CaptureIntent["kind"]>([
  "payment_send",
  "receipt",
  "wifi_qr",
  "business_card",
  "parking",
  "medicine",
  "ticket",
  "travel_booking",
]);

function visionMatchesKind(
  vision: CaptureVisionResult,
  kind: CaptureIntent["kind"]
) {
  if (vision.type === "locate") {
    return kind === "place" || kind === "menu_food" || kind === "address";
  }

  if (vision.type === "product_search") {
    return kind === "product";
  }

  if (vision.type === "utility") {
    return UTILITY_KINDS.has(kind) || kind === "address";
  }

  if (vision.type === "barcode_qr") {
    return kind === "wifi_qr" || kind === "product";
  }

  if (vision.type === "content_summary") {
    return kind === "url";
  }

  if (vision.type === "poster_contact") {
    return (
      kind === "business_card" ||
      kind === "ticket" ||
      kind === "travel_booking"
    );
  }

  return false;
}

function fromVision(
  intent: CaptureIntent,
  vision: CaptureVisionResult
): InferredCaptureIntent {
  const named =
    vision.place_name_or_product?.trim() ||
    vision.place_name?.trim() ||
    vision.product_name?.trim();

  const search_query =
    vision.search_query?.trim() || named || intent.query.trim();

  const place_name =
    vision.type === "locate"
      ? vision.place_name?.trim() ||
        vision.place_name_or_product?.trim() ||
        null
      : vision.place_name;

  const product_name =
    vision.type === "product_search" || vision.type === "barcode_qr"
      ? vision.product_name?.trim() ||
        vision.place_name_or_product?.trim() ||
        null
      : vision.product_name;

  const urls =
    intent.urls ??
    (vision.target_url?.trim() ? [vision.target_url.trim()] : undefined);

  return {
    kind: intent.kind,
    search_query:
      vision.type === "content_summary" && vision.content_title?.trim()
        ? vision.content_title.trim()
        : search_query,
    reasoning_path:
      vision.reasoning_path?.trim() ||
      `비전 추론(${vision.type ?? "unknown"})으로 search_query 재생성`,
    confidence_score: vision.confidence_score ?? 0.7,
    is_ocr_relied: vision.is_ocr_relied ?? false,
    context_signal: vision.context_signal,
    place_name,
    product_name,
    model_number: vision.model_number,
    target_url: vision.target_url ?? null,
    barcode_number: vision.barcode_number ?? null,
    content_title: vision.content_title ?? null,
    ocrText: intent.ocrText,
    amountWon: intent.amountWon,
    merchant: intent.merchant,
    wifiSsid: intent.wifiSsid,
    wifiPassword: intent.wifiPassword,
    parkingSpot: intent.parkingSpot,
    parkingUntil: intent.parkingUntil,
    phone: intent.phone,
    email: intent.email,
    company: intent.company,
    drugName: intent.drugName,
    accountDisplay: intent.accountDisplay,
    bankHint: intent.bankHint,
    eventDate: intent.eventDate,
    venue: intent.venue,
    urls,
  };
}

function fromOcr(
  intent: CaptureIntent,
  reason: string,
  confidence = 0.45
): InferredCaptureIntent {
  return {
    kind: intent.kind,
    search_query: intent.query.trim(),
    reasoning_path: reason,
    confidence_score: confidence,
    is_ocr_relied: true,
    ocrText: intent.ocrText,
    amountWon: intent.amountWon,
    merchant: intent.merchant,
    wifiSsid: intent.wifiSsid,
    wifiPassword: intent.wifiPassword,
    parkingSpot: intent.parkingSpot,
    parkingUntil: intent.parkingUntil,
    phone: intent.phone,
    email: intent.email,
    company: intent.company,
    drugName: intent.drugName,
    accountDisplay: intent.accountDisplay,
    bankHint: intent.bankHint,
    eventDate: intent.eventDate,
    venue: intent.venue,
    urls: intent.urls,
  };
}

/**
 * Vision-first query resolution with OCR fallback only when inference is weak
 * or the intent kind requires structured text (payment, WiFi, receipt, etc.).
 */
export function resolveInferredCaptureIntent(input: {
  intent: CaptureIntent;
  captureVision?: CaptureVisionResult | null;
  visionLabels?: {
    bestGuessLabels?: string[];
    labels?: string[];
  } | null;
}): InferredCaptureIntent {
  const { intent, captureVision, visionLabels } = input;

  if (OCR_STRUCTURED_KINDS.has(intent.kind)) {
    return fromOcr(
      intent,
      `구조화 텍스트 intent(${intent.kind}) — OCR/파서 결과를 search_query로 사용`,
      0.9
    );
  }

  if (isTier2VisionLaw(captureVision)) {
    return fromVision(intent, {
      ...captureVision!,
      reasoning_path:
        captureVision!.reasoning_path?.trim() ||
        `Tier 2(Gemini) confidence ${(captureVision!.confidence_score ?? 0).toFixed(2)} — OCR/regex override 금지`,
      is_ocr_relied: false,
    });
  }

  const visionConfidence = captureVision?.confidence_score ?? 0;
  const visionQuery = captureVision?.search_query?.trim();

  if (
    captureVision &&
    visionQuery &&
    visionConfidence >= VISION_CONFIDENCE_THRESHOLD &&
    visionMatchesKind(captureVision, intent.kind)
  ) {
    return fromVision(intent, captureVision);
  }

  const garbled = isGarbledOcr(intent.query);

  if (
    garbled &&
    intent.kind === "product" &&
    isFoodVision(visionLabels) &&
    !/\d+\s*원|₩|만원/i.test(intent.ocrText)
  ) {
    const search_query = foodVisionSearchFallback(visionLabels).slice(0, 80);
    return {
      kind: "place",
      search_query,
      reasoning_path: inferSignatureFoodPlace(visionLabels)
        ? "벽 낙서 OCR 무시 → 시그니처 메뉴(떡볶이+토스트)로 떡반집 추론"
        : "잘못된 product 분류 교정 → Google Vision food 보조",
      confidence_score: inferSignatureFoodPlace(visionLabels) ? 0.72 : 0.48,
      is_ocr_relied: false,
      place_name: inferSignatureFoodPlace(visionLabels),
      ocrText: intent.ocrText,
    };
  }

  if (
    garbled &&
    captureVision?.search_query?.trim() &&
    visionMatchesKind(captureVision, intent.kind)
  ) {
    return fromVision(intent, {
      ...captureVision,
      reasoning_path:
        captureVision.reasoning_path ??
        "OCR 노이즈 감지 → 비전 추론 search_query로 대체",
      is_ocr_relied: false,
      confidence_score: Math.max(visionConfidence, 0.5),
    });
  }

  if (
    garbled &&
    (intent.kind === "place" || intent.kind === "menu_food") &&
    isFoodVision(visionLabels)
  ) {
    const signature = inferSignatureFoodPlace(visionLabels);
    const label = signature ?? foodVisionSearchFallback(visionLabels);

    return {
      ...fromOcr(intent, "OCR 깨짐 + Google Vision food label 보조", signature ? 0.72 : 0.42),
      kind: intent.kind,
      search_query: label.slice(0, 80),
      place_name: signature,
      is_ocr_relied: false,
      reasoning_path: signature
        ? "OCR 노이즈 → 시그니처 메뉴 조합으로 떡반집 추론"
        : "OCR 노이즈 → Google Vision food label을 임시 search_query로 사용 (Gemini 미호출)",
    };
  }

  if (
    captureVision?.search_query?.trim() &&
    captureVision.is_ocr_relied === false &&
    visionMatchesKind(captureVision, intent.kind)
  ) {
    return fromVision(intent, {
      ...captureVision,
      reasoning_path:
        captureVision.reasoning_path?.trim() ||
        (visionConfidence >= VISION_CONFIDENCE_THRESHOLD
          ? `비전 추론(${captureVision.type})`
          : `비전 partial signal (${visionConfidence.toFixed(2)}) — clean OCR override 방지`),
      confidence_score: Math.max(visionConfidence, 0.45),
      is_ocr_relied: false,
    });
  }

  if (!garbled && intent.query.trim()) {
    return fromOcr(
      intent,
      captureVision
        ? `비전 confidence ${visionConfidence.toFixed(2)} 미달 → OCR query fallback`
        : "Gemini 비전 미호출 → OCR query fallback",
      garbled ? 0.35 : 0.65
    );
  }

  if (captureVision?.search_query?.trim()) {
    return fromVision(intent, captureVision);
  }

  return fromOcr(intent, "추론 실패 → OCR query 최후 fallback", 0.25);
}
