import { NextResponse, type NextRequest } from "next/server";
import {
  MAX_CAPTURE_IMAGE_BYTES,
  processCaptureImageBuffer,
} from "@/lib/capture/process-capture-image";
import { resolveCaptureVisionFromOcrResult } from "@/lib/capture/resolve-capture-vision-fallback";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 60;
export const runtime = "nodejs";

/** Legacy endpoint — delegates to one-pass pipeline (no duplicate Google Vision). */
export async function POST(request: NextRequest) {
  const requestId = readRequestId(request);
  const started = Date.now();

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "image_required" }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "invalid_image_type" }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    if (buffer.byteLength > MAX_CAPTURE_IMAGE_BYTES) {
      return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    }

    const processed = await processCaptureImageBuffer({
      buffer,
      mimeType: image.type,
    });

    let result = processed.captureVision;
    let fallback = processed.fallback;

    if (!result?.search_query && !result?.target_url) {
      result = await resolveCaptureVisionFromOcrResult(processed.ocr);
      fallback = "ocr_only";
    }

    logApi("info", "capture_vision_complete", {
      route: "/api/capture/vision",
      method: request.method,
      requestId,
      status: 200,
      durationMs: Date.now() - started,
      detail: result?.search_query ?? result?.type ?? "unknown",
      reasoning_path: result?.reasoning_path,
      is_ocr_relied: result?.is_ocr_relied,
      confidence_score: result?.confidence_score,
      fallback,
      pipeline: processed.pipeline.source,
    });

    return NextResponse.json({
      type: null,
      search_query: null,
      is_ocr_relied: true,
      reasoning_path: "OCR fallback returned no actionable intent",
      ...(result ?? {}),
      fallback,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "capture_vision_failed";

    logApi("error", "capture_vision_failed", {
      route: "/api/capture/vision",
      method: request.method,
      requestId,
      status: 500,
      durationMs: Date.now() - started,
      detail: message,
    });

    return NextResponse.json({ error: "capture_vision_failed" }, { status: 500 });
  }
}
