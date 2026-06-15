import { NextResponse, type NextRequest } from "next/server";
import { annotateImageBuffer } from "@/lib/vision/google-vision";
import { buildL0MarketContextForListing } from "@/lib/commerce/l0-market-context";
import { buildRimvioL0FromOcr } from "@/lib/routing/rimvio-l0-orchestrator";
import { resolveScreenshotIntent } from "@/lib/screenshot/resolve-screenshot-intent";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const requestId = readRequestId(request);

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
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    }

    const base =
      (await annotateImageBuffer({
        buffer,
        mimeType: image.type,
      })) ?? {
        text: "",
        provider: "tesseract" as const,
      };

    const { intent, refinement } = await resolveScreenshotIntent({
      text: base.text,
      vision: base.vision,
    });

    const draftL0 = buildRimvioL0FromOcr({
      text: base.text,
      vision: base.vision ?? null,
      intentKind: intent?.kind ?? null,
    });

    const market =
      draftL0.domain === "SHOPPING" || draftL0.secondary_domain === "FINANCE"
        ? await buildL0MarketContextForListing({ title: base.text })
        : null;

    const l0 = buildRimvioL0FromOcr({
      text: base.text,
      vision: base.vision ?? null,
      intentKind: intent?.kind ?? null,
      listingPrice: market?.listingPrice ?? null,
      market,
    });

    const result = {
      ...base,
      refinement,
      intent: intent ?? undefined,
      l0,
    };

    logApi("info", "ocr_complete", {
      route: "/api/ocr",
      method: request.method,
      requestId,
      provider: result.provider,
      textLength: result.text.length,
      fashionScore: result.vision?.fashionScore ?? 0,
      refinement: refinement.source,
      intentKind: intent?.kind,
      gateReason: refinement.gateReason,
      confidence: refinement.confidence,
      band: refinement.band,
      signals: refinement.state?.signals?.map((signal) => signal.id),
      policy: refinement.state?.policy,
      cRegex: refinement.breakdown?.cRegex,
      cVision: refinement.breakdown?.cVision,
      cLlm: refinement.breakdown?.cLlm,
      kernelCategory: refinement.kernel?.shadow_intent.category,
      kernelQuery: refinement.kernel?.shadow_intent.query,
      kernelConfidence: refinement.kernel?.shadow_intent.confidence,
      kernelInteractionMode: refinement.kernel?.state.interaction_mode,
      kernelTrajectory: refinement.kernel?.state.trajectory,
      kernelCrossLink: refinement.kernel?.state.cross_link,
      kernelPrimaryAction: refinement.kernel?.policy.primary_action_family,
      llmInvoked: refinement.kernel?.llm.invoked,
    });

    return NextResponse.json(result);
  } catch (error) {
    logApi("error", "ocr_failed", {
      route: "/api/ocr",
      method: request.method,
      requestId,
      detail: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json({ error: "ocr_failed" }, { status: 500 });
  }
}
