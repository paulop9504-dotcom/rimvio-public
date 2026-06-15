import type { CaptureProcessResult } from "@/lib/capture/process-capture-image";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/http/fetch-with-timeout";
import type { OcrResult } from "@/lib/vision/types";

export const CAPTURE_FETCH_TIMEOUT_MS = 22_000;

export type OcrProgress = {
  status: string;
  progress: number;
};

async function extractTextWithTesseract(
  file: File | Blob,
  onProgress?: (progress: OcrProgress) => void
) {
  const { recognize } = await import("tesseract.js");

  const result = await recognize(file, "kor+eng", {
    logger: (message) => {
      if (message.status === "recognizing text") {
        onProgress?.({
          status: message.status,
          progress: Math.round((message.progress ?? 0) * 100),
        });
      }
    },
  });

  return result.data.text?.trim() ?? "";
}

function toFile(file: File | Blob) {
  return file instanceof File
    ? file
    : new File([file], "screenshot.jpg", { type: file.type || "image/jpeg" });
}

/** Unified capture: Google Vision once + Gemini + OCR fallback in one round-trip. */
export async function processCaptureFromImage(
  file: File | Blob,
  onProgress?: (progress: OcrProgress) => void
): Promise<CaptureProcessResult> {
  onProgress?.({ status: "uploading", progress: 5 });

  try {
    const formData = new FormData();
    formData.append("image", toFile(file));

    const response = await fetchWithTimeout("/api/capture/process", {
      method: "POST",
      body: formData,
      timeoutMs: CAPTURE_FETCH_TIMEOUT_MS,
      timeoutLabel: "capture_process",
    });

    if (response.ok) {
      const payload = (await response.json()) as CaptureProcessResult;
      onProgress?.({ status: "done", progress: 100 });
      return payload;
    }
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      onProgress?.({ status: "timeout_fallback", progress: 12 });
    }
    // Fall through to legacy OCR-only path.
  }

  onProgress?.({ status: "recognizing text", progress: 10 });
  const text = await extractTextWithTesseract(file, onProgress);

  return {
    ocr: {
      text,
      provider: "tesseract",
    },
    captureVision: null,
    pipeline: { source: "ocr", captureVision: null },
    fallback: "ocr_only",
  };
}

/** @deprecated Prefer processCaptureFromImage — kept for legacy callers. */
export async function extractTextFromImage(
  file: File | Blob,
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  const processed = await processCaptureFromImage(file, onProgress);
  return processed.ocr;
}

export async function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("invalid image data"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
