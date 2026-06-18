import { shouldSkipCaptureGemini } from "@/lib/capture/commerce-capture-fast-path";
import {
  resolveCapturePipelineDecision,
  type CapturePipelineResolution,
} from "@/lib/capture/resolve-capture-pipeline-order";
import type { CaptureVisionResult } from "@/lib/capture/inferred-intent-types";
import { extractCaptureVisionFromImage } from "@/lib/locate/gemini-place-vision";
import { isCaptureVisionConfigured } from "@/lib/locate/vision-provider-config";
import { resolveScreenshotIntent } from "@/lib/screenshot/resolve-screenshot-intent";
import {
  createCaptureVisionContext,
  getOrFetchVisionOcr,
  readVisionWebContext,
} from "@/lib/vision/capture-vision-context";
import type { OcrResult } from "@/lib/vision/types";

export const MAX_CAPTURE_IMAGE_BYTES = 8 * 1024 * 1024;

export type CaptureProcessResult = {
  ocr: OcrResult;
  captureVision: CaptureVisionResult | null;
  pipeline: CapturePipelineResolution;
  fallback: "gemini" | "ocr_only";
};

async function loadCaptureVision(input: {
  buffer: Buffer;
  mimeType: string;
  store: ReturnType<typeof createCaptureVisionContext>;
}): Promise<{ vision: CaptureVisionResult | null; fallback: "gemini" | "ocr_only" }> {
  if (!isCaptureVisionConfigured()) {
    return { vision: null, fallback: "ocr_only" };
  }

  const webContext = readVisionWebContext(input.store);

  try {
    return {
      vision: await extractCaptureVisionFromImage({
        buffer: input.buffer,
        mimeType: input.mimeType,
        webContext,
        store: input.store,
      }),
      fallback: "gemini",
    };
  } catch {
    return { vision: null, fallback: "ocr_only" };
  }
}

/** Single-pass capture: Google Vision once (context store) → Gemini → OCR fallback. */
export async function processCaptureImageBuffer(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<CaptureProcessResult> {
  if (input.buffer.byteLength > MAX_CAPTURE_IMAGE_BYTES) {
    throw new Error("image_too_large");
  }

  const store = createCaptureVisionContext();
  const baseOcr = await getOrFetchVisionOcr(
    { buffer: input.buffer, mimeType: input.mimeType },
    store
  );

  const skipGemini = shouldSkipCaptureGemini(baseOcr.text);

  const { vision: captureVision, fallback } = skipGemini
    ? { vision: null, fallback: "ocr_only" as const }
    : await loadCaptureVision({
        buffer: input.buffer,
        mimeType: input.mimeType,
        store,
      });

  const pipeline = resolveCapturePipelineDecision({
    captureVision,
    ocrText: baseOcr.text,
    vision: baseOcr.vision,
  });

  if (pipeline.source === "study_domain") {
    return {
      ocr: {
        ...baseOcr,
        intent: pipeline.intent,
      },
      captureVision: pipeline.captureVision,
      pipeline,
      fallback,
    };
  }

  if (pipeline.source === "vision") {
    return {
      ocr: {
        ...baseOcr,
        intent: pipeline.intent,
      },
      captureVision: pipeline.captureVision,
      pipeline,
      fallback,
    };
  }

  const { intent, refinement } = await resolveScreenshotIntent({
    text: baseOcr.text,
    vision: baseOcr.vision,
  });

  return {
    ocr: {
      ...baseOcr,
      refinement,
      intent: intent ?? undefined,
    },
    captureVision,
    pipeline,
    fallback,
  };
}
