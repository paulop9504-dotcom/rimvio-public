import { buildLocateActions, buildLocateSearchFallback } from "@/lib/locate/build-locate-actions";
import { extractCaptureVisionFromImage } from "@/lib/locate/gemini-place-vision";
import { isCaptureVisionConfigured } from "@/lib/locate/vision-provider-config";
import { findPlacesByName } from "@/lib/locate/google-places-find";
import { isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { resolveLocateFromOcrFallback } from "@/lib/locate/resolve-locate-ocr-fallback";
import { readCachedPlace, writeCachedPlace } from "@/lib/locate/place-cache";
import { logApi } from "@/lib/server/logger";
import {
  createCaptureVisionContext,
  getOrFetchVisionOcr,
  readVisionWebContext,
} from "@/lib/vision/capture-vision-context";
import type { VisionSnapshot } from "@/lib/vision/types";
import type { LocateActionResult } from "@/lib/locate/types";

export const VISION_MISSING_WARNING =
  "Warning: Vision API key is missing. Falling back to OCR only.";
/** @deprecated use VISION_MISSING_WARNING */
export const GEMINI_MISSING_WARNING = VISION_MISSING_WARNING;

async function resolveLocateFromGeminiVision(input: {
  buffer: Buffer;
  mimeType: string;
  webContext: VisionSnapshot | null;
  store: ReturnType<typeof createCaptureVisionContext>;
  userLat?: number | null;
  userLng?: number | null;
}): Promise<LocateActionResult> {
  const vision = await extractCaptureVisionFromImage({
    buffer: input.buffer,
    mimeType: input.mimeType,
    webContext: input.webContext,
    store: input.store,
  });

  if (vision.type !== "locate") {
    throw new Error("place_not_identified");
  }

  const placeName =
    vision.place_name ?? vision.place_name_or_product ?? vision.search_query;
  if (!placeName) {
    throw new Error("place_not_identified");
  }

  const meta = {
    contextSignal: vision.context_signal,
    reasoning_path: vision.reasoning_path,
    confidence_score: vision.confidence_score,
    is_ocr_relied: vision.is_ocr_relied ?? false,
  };

  if (!isGooglePlacesConfigured()) {
    return buildLocateSearchFallback({
      placeName,
      ...meta,
      is_ocr_relied: meta.is_ocr_relied,
    });
  }

  const cached = await readCachedPlace(placeName);

  const places = await findPlacesByName({
    placeName,
    userLat: input.userLat,
    userLng: input.userLng,
  });

  const primary = places[0] ?? cached;
  if (!primary) {
    return buildLocateSearchFallback({
      placeName,
      ...meta,
    });
  }

  if (places[0]) {
    await writeCachedPlace(places[0]);
  }

  return buildLocateActions({
    place: primary,
    alternatePlaces: places.slice(1),
    brandHint: placeName,
    ...meta,
  });
}

export async function resolveLocateFromImage(input: {
  buffer: Buffer;
  mimeType: string;
  userLat?: number | null;
  userLng?: number | null;
  requestId?: string;
}): Promise<LocateActionResult & { fallback?: "ocr_only" | "gemini" }> {
  const store = createCaptureVisionContext();
  const baseOcr = await getOrFetchVisionOcr(
    { buffer: input.buffer, mimeType: input.mimeType },
    store
  );
  const webContext = readVisionWebContext(store);

  if (!isCaptureVisionConfigured()) {
    logApi("warn", "vision_missing_ocr_fallback", {
      route: "/api/locate",
      requestId: input.requestId ?? "internal",
      detail: VISION_MISSING_WARNING,
    });

    const result = await resolveLocateFromOcrFallback({
      ...input,
      ocr: baseOcr,
    });
    return { ...result, fallback: "ocr_only" };
  }

  try {
    const result = await resolveLocateFromGeminiVision({
      ...input,
      webContext,
      store,
    });
    return { ...result, fallback: "gemini" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "locate_failed";

    if (message === "place_not_identified" || message === "place_not_found") {
      throw error;
    }

    logApi("warn", "gemini_locate_failed_ocr_fallback", {
      route: "/api/locate",
      requestId: input.requestId ?? "internal",
      detail: message,
    });

    const result = await resolveLocateFromOcrFallback({
      ...input,
      ocr: baseOcr,
    });
    return { ...result, fallback: "ocr_only" };
  }
}
