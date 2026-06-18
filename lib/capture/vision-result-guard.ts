import type { CaptureVisionResult } from "@/lib/capture/inferred-intent-types";
import {
  isGarbledCaptureOcr,
  splitCaptureOcrTokens,
} from "@/lib/capture/is-garbled-capture-ocr";

export const VISION_LOW_CONFIDENCE_REASON =
  "시각적 정보 부족 및 텍스트 노이즈로 식별 불가";

/** Detect fragmentary OCR-style noise that must never become a search query. */
export function looksLikeVisionNoiseQuery(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }

  const hangul = (trimmed.match(/[가-힣]/g) ?? []).length;
  const latin = (trimmed.match(/[A-Za-z]/g) ?? []).length;
  const digits = (trimmed.match(/[0-9]/g) ?? []).length;
  const meaningful = hangul + latin + digits;

  if (hangul >= 2 && latin === 0) {
    return false;
  }

  if (meaningful < trimmed.length * 0.35) {
    return true;
  }

  const words = trimmed.split(/\s+/).filter((part) => part.length >= 1);
  if (
    words.length >= 2 &&
    words.every((word) => word.length <= 4 && /^[A-Za-z]+$/.test(word))
  ) {
    return true;
  }

  const tokens = splitCaptureOcrTokens(trimmed);
  const shortLatinTokens = tokens.filter((token) =>
    /^[A-Za-z]{1,5}$/.test(token)
  );
  if (tokens.length >= 2 && shortLatinTokens.length >= 2) {
    return true;
  }
  if (tokens.length >= 3 && shortLatinTokens.length >= tokens.length * 0.55) {
    return true;
  }

  if (/^[A-Za-z](?:\s+[A-Za-z]{1,3}){2,}/.test(trimmed) && hangul === 0) {
    return true;
  }

  if (/^[\W_]+$/.test(trimmed)) {
    return true;
  }

  if (hangul < 2 && latin > 0 && isGarbledCaptureOcr(trimmed)) {
    return true;
  }

  return false;
}

function hasActionablePayload(result: CaptureVisionResult) {
  if (result.search_query?.trim()) {
    return true;
  }

  if (
    result.target_url?.trim() &&
    (result.type === "barcode_qr" || result.type === "content_summary")
  ) {
    return true;
  }

  return false;
}

function isBarcodeDigitsOnlyQuery(query: string) {
  return /^\d[\d\s-]{7,}$/.test(query.trim());
}

function toUnknown(result: CaptureVisionResult): CaptureVisionResult {
  return {
    type: "unknown",
    search_query: null,
    place_name_or_product: null,
    place_name: null,
    product_name: null,
    model_number: null,
    target_url: null,
    barcode_number: null,
    content_title: null,
    confidence_score: result.confidence_score,
    context_signal: result.context_signal,
    reasoning_path: VISION_LOW_CONFIDENCE_REASON,
    is_ocr_relied: false,
  };
}

/**
 * Server-side guard: enforce Strict Fallback even when the model over-claims.
 * - confidence < 0.5 → unknown
 * - noisy search_query → unknown
 * - locate/product with is_ocr_relied → unknown (utility exempt)
 */
export function sanitizeCaptureVisionResult(
  result: CaptureVisionResult
): CaptureVisionResult {
  if (result.type === "unknown" || result.type === null) {
    return {
      ...result,
      type: result.type === null ? null : "unknown",
      search_query: null,
      place_name_or_product: null,
      place_name: null,
      product_name: null,
      model_number: null,
      is_ocr_relied: false,
      reasoning_path:
        result.reasoning_path?.trim() || VISION_LOW_CONFIDENCE_REASON,
    };
  }

  const confidence = result.confidence_score ?? 0;
  const query = result.search_query?.trim() ?? "";

  if (confidence < 0.5) {
    return toUnknown(result);
  }

  if (query && looksLikeVisionNoiseQuery(query)) {
    return toUnknown(result);
  }

  if (
    result.is_ocr_relied &&
    result.type !== "utility" &&
    (result.type === "locate" ||
      result.type === "product_search" ||
      result.type === "barcode_qr")
  ) {
    return toUnknown(result);
  }

  if (
    result.type === "barcode_qr" &&
    query &&
    isBarcodeDigitsOnlyQuery(query) &&
    !result.place_name_or_product?.trim()
  ) {
    return toUnknown(result);
  }

  if (!hasActionablePayload(result)) {
    return toUnknown(result);
  }

  return result;
}
