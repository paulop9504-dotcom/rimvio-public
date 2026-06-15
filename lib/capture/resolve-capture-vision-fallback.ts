import { resolveInferredCaptureIntent } from "@/lib/capture/resolve-inferred-query";
import { detectCaptureIntent } from "@/lib/capture/detect-capture-intent";
import type { CaptureVisionResult } from "@/lib/capture/inferred-intent-types";
import { resolveScreenshotIntent } from "@/lib/screenshot/resolve-screenshot-intent";
import { annotateImageBuffer } from "@/lib/vision/google-vision";
import type { OcrResult } from "@/lib/vision/types";

function intentToVisionType(kind: string): CaptureVisionResult["type"] {
  if (kind === "place" || kind === "menu_food" || kind === "address") {
    return "locate";
  }

  if (kind === "product") {
    return "product_search";
  }

  if (kind === "wifi_qr") {
    return "barcode_qr";
  }

  if (kind === "url") {
    return "content_summary";
  }

  if (kind === "business_card" || kind === "ticket" || kind === "travel_booking") {
    return "poster_contact";
  }

  if (
    kind === "payment_send" ||
    kind === "receipt" ||
    kind === "parking" ||
    kind === "medicine"
  ) {
    return "utility";
  }

  return "unknown";
}

export async function resolveCaptureVisionFromOcrResult(
  ocr: Pick<OcrResult, "text" | "vision">
): Promise<CaptureVisionResult | null> {
  const { intent: screenshotIntent } = await resolveScreenshotIntent({
    text: ocr.text,
    vision: ocr.vision,
  });

  const intent =
    screenshotIntent ??
    detectCaptureIntent({
      text: ocr.text,
      vision: ocr.vision,
    });

  if (!intent) {
    return null;
  }

  const inferred = resolveInferredCaptureIntent({
    intent,
    visionLabels: ocr.vision,
  });

  const type = intentToVisionType(intent.kind);
  const search_query = inferred.search_query.trim() || null;
  const target_url = inferred.target_url ?? inferred.urls?.[0] ?? null;

  if ((!search_query && !target_url) || type === "unknown") {
    return {
      type: type === "unknown" ? "unknown" : null,
      search_query: null,
      target_url: null,
      reasoning_path:
        inferred.reasoning_path ??
        "Gemini unavailable — OCR pipeline could not infer a search query",
      confidence_score: inferred.confidence_score,
      is_ocr_relied: true,
    };
  }

  return {
    type,
    search_query,
    target_url,
    content_title: inferred.content_title ?? null,
    barcode_number: inferred.barcode_number ?? null,
    place_name_or_product:
      type === "locate" ||
      type === "product_search" ||
      type === "barcode_qr" ||
      type === "poster_contact"
        ? search_query
        : null,
    place_name: type === "locate" || type === "poster_contact" ? search_query : null,
    product_name:
      type === "product_search" || type === "barcode_qr" ? search_query : null,
    confidence_score: inferred.confidence_score,
    context_signal: inferred.context_signal,
    reasoning_path:
      inferred.reasoning_path ??
      "Gemini unavailable — OCR + rule pipeline fallback",
    is_ocr_relied: true,
  };
}

export async function resolveCaptureVisionFromOcr(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<CaptureVisionResult | null> {
  const ocr =
    (await annotateImageBuffer({
      buffer: input.buffer,
      mimeType: input.mimeType,
    })) ?? { text: "", provider: "tesseract" as const };

  return resolveCaptureVisionFromOcrResult(ocr);
}
