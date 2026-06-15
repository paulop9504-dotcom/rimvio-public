import type { CaptureIntent, CaptureIntentKind } from "@/lib/capture/capture-intent-types";
import {
  pickStudyHeaderFromText,
  shouldForceStudyDomain,
} from "@/lib/capture/capture-domain-router";
import { analyzeCaptureLayout } from "@/lib/capture/capture-layout-analyzer";
import { detectCaptureIntent } from "@/lib/capture/detect-capture-intent";
import type {
  CaptureVisionResult,
  CaptureVisionType,
  InferredCaptureIntent,
} from "@/lib/capture/inferred-intent-types";
import { applyOcrRefinement } from "@/lib/screenshot/resolve-screenshot-intent";
import type { OcrResult, VisionSnapshot } from "@/lib/vision/types";
export const CAPTURE_VISION_AUTHORITY_THRESHOLD = 0.5;

const ACTIONABLE_VISION_TYPES = new Set<CaptureVisionType>([
  "locate",
  "product_search",
  "utility",
  "barcode_qr",
  "content_summary",
  "poster_contact",
]);

/**
 * Gemini vision result is authoritative when it clearly decided without OCR reliance.
 * OCR regex routing must not run when this returns true.
 */
export function isAuthoritativeCaptureVision(
  vision: CaptureVisionResult | null | undefined
): vision is CaptureVisionResult {
  if (!vision?.type || !ACTIONABLE_VISION_TYPES.has(vision.type)) {
    return false;
  }

  if (vision.is_ocr_relied !== false) {
    return false;
  }

  const confidence = vision.confidence_score ?? 0;
  if (confidence < CAPTURE_VISION_AUTHORITY_THRESHOLD) {
    return false;
  }

  if (vision.search_query?.trim()) {
    return true;
  }

  if (
    vision.target_url?.trim() &&
    (vision.type === "barcode_qr" || vision.type === "content_summary")
  ) {
    return true;
  }

  return false;
}

export function captureKindFromVisionType(
  type: CaptureVisionType
): CaptureIntentKind {
  switch (type) {
    case "locate":
      return "place";
    case "product_search":
    case "barcode_qr":
      return "product";
    case "content_summary":
      return "url";
    case "poster_contact":
      return "business_card";
    case "utility":
      return "receipt";
    default:
      return "place";
  }
}

function pickVisionSearchQuery(vision: CaptureVisionResult) {
  return (
    vision.search_query?.trim() ||
    vision.content_title?.trim() ||
    vision.place_name_or_product?.trim() ||
    vision.place_name?.trim() ||
    vision.product_name?.trim() ||
    vision.target_url?.trim() ||
    ""
  );
}

/** Build legacy CaptureIntent shell only for session/UI — vision already decided. */
export function minimalIntentFromAuthoritativeVision(
  vision: CaptureVisionResult,
  ocrText = ""
): CaptureIntent {
  const kind = captureKindFromVisionType(vision.type!);
  const query = pickVisionSearchQuery(vision);
  const urls =
    kind === "url" && vision.target_url?.trim()
      ? [vision.target_url.trim()]
      : undefined;

  return {
    kind,
    query,
    ocrText,
    urls,
  };
}

/** 100% vision-derived intent — no merge with OCR regex output. */
export function inferredIntentFromAuthoritativeVision(
  vision: CaptureVisionResult,
  ocrText = ""
): InferredCaptureIntent {
  const kind = captureKindFromVisionType(vision.type!);
  const search_query = pickVisionSearchQuery(vision);

  return {
    kind,
    search_query,
    reasoning_path:
      vision.reasoning_path?.trim() ||
      `비전 AI(${vision.type}) 우선 결정 — OCR 라우터 bypass`,
    confidence_score: vision.confidence_score ?? 0.7,
    is_ocr_relied: false,
    context_signal: vision.context_signal,
    place_name:
      vision.type === "locate" || vision.type === "poster_contact"
        ? vision.place_name?.trim() ||
          vision.place_name_or_product?.trim() ||
          null
        : vision.place_name,
    product_name:
      vision.type === "product_search" || vision.type === "barcode_qr"
        ? vision.product_name?.trim() ||
          vision.place_name_or_product?.trim() ||
          null
        : vision.product_name,
    model_number: vision.model_number,
    target_url: vision.target_url ?? null,
    barcode_number: vision.barcode_number ?? null,
    content_title: vision.content_title ?? null,
    ocrText,
    urls:
      kind === "url" && vision.target_url?.trim()
        ? [vision.target_url.trim()]
        : undefined,
  };
}

export type CapturePipelineResolution =
  | {
      source: "vision";
      captureVision: CaptureVisionResult;
      intent: CaptureIntent;
      inferredCaptureIntent: InferredCaptureIntent;
    }
  | {
      source: "study_domain";
      captureVision: CaptureVisionResult | null;
      intent: CaptureIntent;
      inferredCaptureIntent: InferredCaptureIntent;
    }
  | {
      source: "ocr";
      captureVision: CaptureVisionResult | null;
    };

function buildStudyDomainIntent(ocrText: string): CaptureIntent {
  const header = pickStudyHeaderFromText(ocrText).slice(0, 80);
  return {
    kind: "document_study",
    query: header,
    ocrText: ocrText.replace(/\s+/g, " ").trim(),
  };
}

function inferredIntentFromStudyDomain(intent: CaptureIntent): InferredCaptureIntent {
  return {
    kind: "document_study",
    search_query: intent.query,
    reasoning_path: "L-stage Academic Priority — STUDY winner-take-all (E-stage override)",
    confidence_score: 0.92,
    is_ocr_relied: true,
    ocrText: intent.ocrText,
  };
}

/**
 * E-stage guard — even authoritative Gemini vision yields to high-confidence STUDY OCR.
 */
function tryStudyDomainOverride(input: {
  ocrText?: string;
  vision?: VisionSnapshot | null;
  captureVision?: CaptureVisionResult | null;
}): Extract<CapturePipelineResolution, { source: "study_domain" }> | null {
  const ocrText = input.ocrText ?? "";
  if (!ocrText.trim()) {
    return null;
  }

  const layout = analyzeCaptureLayout({
    rawText: ocrText,
    vision: input.vision ?? null,
  });

  const forceStudy = shouldForceStudyDomain({
    rawText: ocrText,
    ocrText,
    vision: input.vision ?? null,
  });

  if (!forceStudy && !layout.studyParagraphLayout) {
    return null;
  }

  const intent = buildStudyDomainIntent(ocrText);

  return {
    source: "study_domain",
    captureVision: input.captureVision ?? null,
    intent,
    inferredCaptureIntent: inferredIntentFromStudyDomain(intent),
  };
}

export function resolveCapturePipelineDecision(input: {
  captureVision: CaptureVisionResult | null;
  ocrText?: string;
  vision?: VisionSnapshot | null;
}): CapturePipelineResolution {
  const studyOverride = tryStudyDomainOverride({
    ocrText: input.ocrText,
    vision: input.vision,
    captureVision: input.captureVision,
  });

  if (studyOverride) {
    return studyOverride;
  }

  if (isAuthoritativeCaptureVision(input.captureVision)) {
    const ocrText = input.ocrText ?? "";
    return {
      source: "vision",
      captureVision: input.captureVision,
      intent: minimalIntentFromAuthoritativeVision(input.captureVision, ocrText),
      inferredCaptureIntent: inferredIntentFromAuthoritativeVision(
        input.captureVision,
        ocrText
      ),
    };
  }

  return {
    source: "ocr",
    captureVision: input.captureVision,
  };
}

/**
 * OCR fallback path — trust /api/ocr (LLM-refined) before regex router.
 * Never merge tiers: apply refinement when present, else regex last resort.
 */
export function resolveOcrFallbackIntent(input: {
  ocr: Pick<OcrResult, "text" | "vision" | "intent" | "refinement">;
}): CaptureIntent | null {
  const fromApi = input.ocr.intent;
  if (fromApi) {
    return applyOcrRefinement(fromApi, input.ocr.refinement) ?? fromApi;
  }

  return detectCaptureIntent({
    text: input.ocr.text,
    vision: input.ocr.vision,
  });
}