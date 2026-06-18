import {
  parseGoogleVisionResponse,
  visionSearchQuery,
} from "@/lib/vision/parse-vision-response";
import { GOOGLE_VISION_ANNOTATE_FEATURES } from "@/lib/vision/web-detection-hints";
import { searchGoogleCseImages } from "@/lib/vision/google-image-search";
import type { OcrResult, VisionSnapshot } from "@/lib/vision/types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type AnnotateInput = {
  buffer: Buffer;
  mimeType?: string | null;
};

export function isGoogleVisionConfigured() {
  return Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim());
}

export async function annotateImageBuffer(input: AnnotateInput): Promise<OcrResult | null> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  if (input.buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("image_too_large");
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        requests: [
          {
            image: { content: input.buffer.toString("base64") },
            features: [...GOOGLE_VISION_ANNOTATE_FEATURES],
            imageContext: { languageHints: ["ko", "en", "ja"] },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`vision_request_failed:${response.status}:${detail.slice(0, 120)}`);
  }

  const payload = (await response.json()) as Parameters<
    typeof parseGoogleVisionResponse
  >[0];
  const vision = parseGoogleVisionResponse(payload);
  if (!vision) {
    return null;
  }

  const query = visionSearchQuery(vision, vision.text);
  if (query) {
    const similarImageResults = await searchGoogleCseImages(query, 4);
    vision.similarImageResults = similarImageResults;
  }

  return {
    text: vision.text,
    provider: "google_vision",
    vision,
  };
}

export async function annotateImageFile(file: File | Blob): Promise<OcrResult | null> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return annotateImageBuffer({ buffer, mimeType: file.type || "image/jpeg" });
}

export function mergeVisionIntoResult(
  base: OcrResult,
  vision: VisionSnapshot | null | undefined
): OcrResult {
  if (!vision) {
    return base;
  }

  return {
    text: base.text.trim() || vision.text,
    provider: vision.provider,
    vision,
  };
}
