import { NextResponse, type NextRequest } from "next/server";
import {
  MAX_CAPTURE_IMAGE_BYTES,
  processCaptureImageBuffer,
} from "@/lib/capture/process-capture-image";
import { buildL0MarketContextForListing } from "@/lib/commerce/l0-market-context";
import { buildRimvioL0FromOcr } from "@/lib/routing/rimvio-l0-orchestrator";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 60;
export const runtime = "nodejs";

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

    const result = await processCaptureImageBuffer({
      buffer,
      mimeType: image.type,
    });

    const draftL0 = buildRimvioL0FromOcr({
      text: result.ocr.text,
      vision: result.ocr.vision ?? null,
      intentKind: result.ocr.intent?.kind ?? null,
    });

    const market =
      draftL0.domain === "SHOPPING" || draftL0.secondary_domain === "FINANCE"
        ? await buildL0MarketContextForListing({ title: result.ocr.text })
        : null;

    const l0 = buildRimvioL0FromOcr({
      text: result.ocr.text,
      vision: result.ocr.vision ?? null,
      intentKind: result.ocr.intent?.kind ?? null,
      listingPrice: market?.listingPrice ?? null,
      market,
    });

    logApi("info", "capture_process_complete", {
      route: "/api/capture/process",
      method: request.method,
      requestId,
      status: 200,
      durationMs: Date.now() - started,
      pipeline: result.pipeline.source,
      intentKind: result.ocr.intent?.kind,
      l0Domain: l0.domain,
      visionType: result.captureVision?.type,
      fallback: result.fallback,
    });

    return NextResponse.json({ ...result, l0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "capture_process_failed";

    logApi("error", "capture_process_failed", {
      route: "/api/capture/process",
      method: request.method,
      requestId,
      status: 500,
      durationMs: Date.now() - started,
      detail: message,
    });

    return NextResponse.json({ error: "capture_process_failed" }, { status: 500 });
  }
}
