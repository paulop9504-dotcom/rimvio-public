import {
  buildCaptureActions,
  captureRemoteSignalLine,
  resolveCaptureRemoteFromIntent,
} from "@/lib/capture/build-capture-actions";
import {
  captureIntentCategory,
  captureIntentTitle,
} from "@/lib/capture/detect-capture-intent";
import type { InferredCaptureIntent } from "@/lib/capture/inferred-intent-types";
import { resolveInferredCaptureIntent } from "@/lib/capture/resolve-inferred-query";
import type { CaptureVisionResult } from "@/lib/capture/inferred-intent-types";
import type { ScreenshotIntent } from "@/lib/screenshot/classify-intent";
import type { VisionSnapshot } from "@/lib/vision/types";
import type { LinkActionItem } from "@/types/database";

function resolveScreenshotInferred(
  intent: ScreenshotIntent,
  options?: {
    captureVision?: CaptureVisionResult | null;
    vision?: VisionSnapshot | null;
    inferredCaptureIntent?: InferredCaptureIntent;
  }
): InferredCaptureIntent {
  if (options?.inferredCaptureIntent) {
    return options.inferredCaptureIntent;
  }

  return resolveInferredCaptureIntent({
    intent,
    captureVision: options?.captureVision,
    visionLabels: options?.vision,
  });
}

export function buildScreenshotActions(
  intent: ScreenshotIntent,
  options?: {
    captureVision?: CaptureVisionResult | null;
    vision?: VisionSnapshot | null;
    inferredCaptureIntent?: InferredCaptureIntent;
  }
): LinkActionItem[] {
  const inferred = resolveScreenshotInferred(intent, options);

  return buildCaptureActions(inferred, options?.vision);
}

export function screenshotLinkTitle(
  intent: ScreenshotIntent,
  options?: {
    captureVision?: CaptureVisionResult | null;
    vision?: VisionSnapshot | null;
    inferredCaptureIntent?: InferredCaptureIntent;
  }
) {
  const inferred = resolveScreenshotInferred(intent, options);

  if (!inferred.is_ocr_relied && inferred.search_query.trim()) {
    return inferred.search_query;
  }

  if (inferred.context_signal?.trim()) {
    return inferred.search_query;
  }

  return captureIntentTitle(
    inferred.kind === intent.kind
      ? intent
      : { ...intent, kind: inferred.kind, query: inferred.search_query }
  );
}

export function screenshotLinkCategory(
  intent: ScreenshotIntent,
  options?: {
    captureVision?: CaptureVisionResult | null;
    vision?: VisionSnapshot | null;
    inferredCaptureIntent?: InferredCaptureIntent;
  }
) {
  const inferred = resolveScreenshotInferred(intent, options);

  return captureIntentCategory({
    ...intent,
    kind: inferred.kind,
  });
}

export {
  captureRemoteSignalLine,
  resolveCaptureRemoteFromIntent,
};

export { resolveInferredCaptureIntent } from "@/lib/capture/resolve-inferred-query";
