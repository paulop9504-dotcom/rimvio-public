import { annotateImageBuffer } from "@/lib/vision/google-vision";
import type { OcrResult } from "@/lib/vision/types";

/** Request-scoped store — prevents duplicate Google Vision API calls in one pipeline. */
export type CaptureVisionContextStore = {
  ocr: OcrResult | null;
};

export function createCaptureVisionContext(): CaptureVisionContextStore {
  return { ocr: null };
}

export function hasVisionOcrResult(
  store: CaptureVisionContextStore
): store is CaptureVisionContextStore & { ocr: OcrResult } {
  return store.ocr !== null;
}

export async function getOrFetchVisionOcr(
  input: { buffer: Buffer; mimeType: string },
  store: CaptureVisionContextStore
): Promise<OcrResult> {
  if (hasVisionOcrResult(store)) {
    return store.ocr;
  }

  const ocr =
    (await annotateImageBuffer({
      buffer: input.buffer,
      mimeType: input.mimeType,
    })) ?? {
      text: "",
      provider: "tesseract" as const,
    };

  store.ocr = ocr;
  return ocr;
}

export function readVisionWebContext(store: CaptureVisionContextStore) {
  return store.ocr?.vision ?? null;
}
