import { NextResponse, type NextRequest } from "next/server";
import { resolveLocateFromImage } from "@/lib/locate/resolve-locate-from-image";
import { logApi } from "@/lib/server/logger";
import { readRequestId } from "@/lib/server/request-context";

export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function parseOptionalCoord(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

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
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    }

    const userLat = parseOptionalCoord(formData.get("lat"));
    const userLng = parseOptionalCoord(formData.get("lng"));

    const result = await resolveLocateFromImage({
      buffer,
      mimeType: image.type,
      userLat,
      userLng,
      requestId,
    });

    logApi("info", "locate_complete", {
      route: "/api/locate",
      method: request.method,
      requestId,
      status: 200,
      durationMs: Date.now() - started,
      detail: result.place_name,
      fallback: result.fallback,
      is_ocr_relied: result.is_ocr_relied,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "locate_failed";

    logApi("error", "locate_failed", {
      route: "/api/locate",
      method: request.method,
      requestId,
      status: message === "place_not_identified" || message === "place_not_found" ? 404 : 500,
      durationMs: Date.now() - started,
      detail: message,
    });

    if (message === "place_not_identified" || message === "place_not_found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: "locate_failed" }, { status: 500 });
  }
}
