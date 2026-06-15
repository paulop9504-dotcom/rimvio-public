import { resolveInferredCaptureIntent } from "@/lib/capture/resolve-inferred-query";
import { resolveOcrFallbackIntent } from "@/lib/capture/resolve-capture-pipeline-order";
import {
  buildLocateActions,
  buildLocateSearchFallback,
} from "@/lib/locate/build-locate-actions";
import { findPlacesByName } from "@/lib/locate/google-places-find";
import { isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { readCachedPlace, writeCachedPlace } from "@/lib/locate/place-cache";
import { resolveScreenshotIntent } from "@/lib/screenshot/resolve-screenshot-intent";
import { annotateImageBuffer } from "@/lib/vision/google-vision";
import type { LocateActionResult } from "@/lib/locate/types";
import type { OcrResult } from "@/lib/vision/types";

const PLACE_KINDS = new Set(["place", "menu_food", "address"]);

export async function resolveLocateFromOcrFallback(input: {
  buffer: Buffer;
  mimeType: string;
  userLat?: number | null;
  userLng?: number | null;
  ocr?: OcrResult;
}): Promise<LocateActionResult> {
  const ocr =
    input.ocr ??
    (await annotateImageBuffer({
      buffer: input.buffer,
      mimeType: input.mimeType,
    })) ??
    { text: "", provider: "tesseract" as const };

  let resolvedOcr = ocr;
  if (!ocr.intent) {
    const { intent, refinement } = await resolveScreenshotIntent({
      text: ocr.text,
      vision: ocr.vision,
    });
    resolvedOcr = {
      ...ocr,
      intent: intent ?? undefined,
      refinement,
    };
  }

  const intent = resolveOcrFallbackIntent({ ocr: resolvedOcr });

  if (!intent || !PLACE_KINDS.has(intent.kind)) {
    throw new Error("place_not_identified");
  }

  const inferred = resolveInferredCaptureIntent({
    intent,
    visionLabels: ocr.vision,
  });

  const placeName = inferred.search_query.trim();
  if (!placeName) {
    throw new Error("place_not_identified");
  }

  const meta = {
    contextSignal: inferred.context_signal ?? `📍 ${placeName}`,
    reasoning_path:
      inferred.reasoning_path ??
      "Gemini unavailable — OCR + rule pipeline fallback",
    confidence_score: inferred.confidence_score,
    is_ocr_relied: true,
  };

  if (isGooglePlacesConfigured()) {
    const cached = await readCachedPlace(placeName);
    const places = await findPlacesByName({
      placeName,
      userLat: input.userLat,
      userLng: input.userLng,
    });

    const primary = places[0] ?? cached;
    if (primary) {
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
  }

  return buildLocateSearchFallback({
    placeName,
    ...meta,
  });
}
