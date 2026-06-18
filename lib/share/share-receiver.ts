import { NextResponse, type NextRequest } from "next/server";
import { parseSharePayload } from "@/lib/share/parse-share-payload";
import { buildCapturePayload } from "@/lib/screenshot/process-screenshot-server";
import { writeCaptureCache } from "@/lib/server/capture-cache";
import { logApi } from "@/lib/server/logger";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function pickSharedImage(formData: FormData) {
  const candidates = [
    ...formData.getAll("media"),
    ...formData.getAll("files"),
    ...formData.getAll("file"),
  ];

  for (const entry of candidates) {
    if (entry instanceof File && entry.type.startsWith("image/")) {
      return entry;
    }
  }

  return null;
}

export async function handleShareReceiverPost(
  request: NextRequest,
  requestId: string
) {
  try {
    const formData = await request.formData();
    const image = pickSharedImage(formData);

    if (image) {
      const buffer = Buffer.from(await image.arrayBuffer());
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        return NextResponse.redirect(
          new URL("/?capture_error=too_large", request.url),
          303
        );
      }

      const payload = await buildCapturePayload({
        buffer,
        mimeType: image.type || "image/jpeg",
      });

      await writeCaptureCache(payload);

      logApi("info", "share_image_received", {
        route: "/share",
        requestId,
        provider: payload.provider,
        title: payload.title,
        refinement: payload.refinement?.source,
      });

      return NextResponse.redirect(
        new URL(`/?capture=${payload.id}`, request.url),
        303
      );
    }

    const parsed = parseSharePayload({
      title: formData.get("title")?.toString(),
      text: formData.get("text")?.toString(),
      url: formData.get("url")?.toString(),
    });

    if (parsed.url) {
      const params = new URLSearchParams();
      params.set("url", parsed.url);
      if (parsed.title) {
        params.set("title", parsed.title);
      }

      return NextResponse.redirect(
        new URL(`/now?${params.toString()}`, request.url),
        303
      );
    }

    return NextResponse.redirect(new URL("/?paste=1", request.url), 303);
  } catch (error) {
    logApi("error", "share_post_failed", {
      route: "/share",
      requestId,
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.redirect(new URL("/?capture_error=failed", request.url), 303);
  }
}
