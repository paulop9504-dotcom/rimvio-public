"use client";

import { LOCAL_LINKS_UPDATED } from "@/lib/demo/seed";
import {
  readCaptureVision,
  setCaptureIntent,
} from "@/lib/capture/capture-intent-session";
import { resolveOcrFallbackIntent } from "@/lib/capture/resolve-capture-pipeline-order";
import type { InferredCaptureIntent } from "@/lib/capture/inferred-intent-types";
import { attachClientBehaviorKernel } from "@/lib/intent/enrich-kernel-client";
import { addLocalLink, buildLocalLink } from "@/lib/local-links/store";
import {
  buildScreenshotActions,
  screenshotLinkCategory,
  screenshotLinkTitle,
} from "@/lib/screenshot/build-screenshot-actions";
import {
  isScreenshotConfirmRequired,
  type OcrRefinement,
} from "@/lib/screenshot/refine-ocr-llm";
import {
  processCaptureFromImage,
  readImageAsDataUrl,
} from "@/lib/screenshot/ocr-text";
import {
  prepareCaptureImageForUpload,
  prepareCaptureThumbnailDataUrl,
} from "@/lib/capture/prepare-capture-image";
import { ingestPastedLinks, type InboxPasteResult } from "@/lib/share/inbox-paste";
import type { CapturePayload } from "@/lib/screenshot/capture-types";
import type { ScreenshotIntent } from "@/lib/screenshot/classify-intent";
import type { CaptureVisionResult } from "@/lib/capture/inferred-intent-types";
import type { OcrResult } from "@/lib/vision/types";
import type { LinkRow } from "@/types/database";

export type ScreenshotIngestProgress = {
  phase: "ocr" | "save" | "confirm";
  progress: number;
  status?: string;
};

export type ScreenshotConfirmPayload = {
  file: File;
  intent: ScreenshotIntent;
  ocr: OcrResult;
  refinement: OcrRefinement;
  captureVision?: CaptureVisionResult | null;
};

export class ScreenshotCaptureDetected extends Error {
  readonly code = "screenshot_capture_detected";

  constructor(readonly intent: ScreenshotIntent, readonly file: File) {
    super("screenshot_capture_detected");
  }
}

/** @deprecated use ScreenshotCaptureDetected */
export class ScreenshotPaymentDetected extends ScreenshotCaptureDetected {}

export class ScreenshotConfirmRequired extends Error {
  readonly code = "screenshot_confirm_required";

  constructor(readonly payload: ScreenshotConfirmPayload) {
    super("screenshot_confirm_required");
  }
}

function notifyLinksUpdated() {
  window.dispatchEvent(new Event(LOCAL_LINKS_UPDATED));
}

function buildCaptureUrl(id: string) {
  return `https://rimvio.app/capture/${id}`;
}

async function saveScreenshotIntent(input: {
  file: File;
  originalFile?: File;
  intent: ScreenshotIntent;
  ocr: OcrResult;
  captureVision?: CaptureVisionResult | null;
  inferredCaptureIntent?: InferredCaptureIntent;
  captureId?: string;
}): Promise<InboxPasteResult> {
  if (input.intent.kind === "url" && input.intent.urls?.length) {
    return ingestPastedLinks(input.intent.urls.join("\n"));
  }

  setCaptureIntent(input.intent, input.captureVision);

  const id = input.captureId ?? crypto.randomUUID();
  const dataUrl = await prepareCaptureThumbnailDataUrl(input.file);

  try {
    const { attachMediaSpacetime } = await import(
      "@/lib/location-ping/attach-media-spacetime"
    );
    await attachMediaSpacetime({
      file: input.originalFile ?? input.file,
      origin: "feed_capture",
      originRef: id,
    });
  } catch {
    // Capture save should not fail when GPS is unavailable.
  }
  const actionOptions = {
    captureVision: input.captureVision,
    vision: input.ocr.vision,
    inferredCaptureIntent: input.inferredCaptureIntent,
  };

  const link = buildLocalLink({
    originalUrl: buildCaptureUrl(id),
    title: screenshotLinkTitle(input.intent, actionOptions),
    category: screenshotLinkCategory(input.intent, actionOptions),
    thumbnailUrl: dataUrl,
    sourceType: "screenshot",
    visualMode: "thumb",
    actions: buildScreenshotActions(input.intent, actionOptions),
  });

  addLocalLink(link);
  notifyLinksUpdated();

  return {
    added: 1,
    skipped: 0,
    links: [link],
  };
}

export function saveCapturePayload(payload: CapturePayload): InboxPasteResult {
  const link = buildLocalLink({
    originalUrl: buildCaptureUrl(payload.id),
    title: payload.title,
    category: payload.category,
    thumbnailUrl: payload.thumbnailDataUrl,
    sourceType: "screenshot",
    visualMode: "thumb",
    actions: payload.actions,
  });

  addLocalLink(link);
  notifyLinksUpdated();

  return {
    added: 1,
    skipped: 0,
    links: [link],
  };
}

export async function fetchCapturePayload(token: string): Promise<CapturePayload | null> {
  try {
    const response = await fetch(`/api/capture/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CapturePayload;
  } catch {
    return null;
  }
}

export async function ingestCaptureToken(token: string): Promise<InboxPasteResult> {
  const payload = await fetchCapturePayload(token);
  if (!payload) {
    throw new Error("capture_not_found");
  }

  return saveCapturePayload(payload);
}

export async function commitConfirmedScreenshot(
  payload: ScreenshotConfirmPayload,
  onProgress?: (progress: ScreenshotIngestProgress) => void
): Promise<InboxPasteResult> {
  onProgress?.({ phase: "save", progress: 90 });

  const captureVision =
    payload.captureVision ?? readCaptureVision() ?? null;

  const result = await saveScreenshotIntent({
    file: payload.file,
    originalFile: payload.file,
    intent: payload.intent,
    ocr: payload.ocr,
    captureVision,
  });

  onProgress?.({ phase: "save", progress: 100 });
  return result;
}

export async function ingestScreenshot(
  file: File,
  onProgress?: (progress: ScreenshotIngestProgress) => void
): Promise<InboxPasteResult> {
  onProgress?.({ phase: "ocr", progress: 0, status: "reading" });

  const captureId = crypto.randomUUID();
  const prepared = await prepareCaptureImageForUpload(file);

  const processed = await processCaptureFromImage(prepared, (event) => {
    onProgress?.({
      phase: "ocr",
      progress: event.progress,
      status: event.status,
    });
  });

  const { ocr, captureVision, pipeline } = processed;

  if (pipeline.source === "vision" || pipeline.source === "study_domain") {
    const { intent, inferredCaptureIntent } = pipeline;

    if (intent.kind === "url" && intent.urls?.length) {
      return ingestPastedLinks(intent.urls.join("\n"));
    }

    onProgress?.({ phase: "save", progress: 90 });
    const result = await saveScreenshotIntent({
      file: prepared,
      originalFile: file,
      captureId,
      intent,
      ocr,
      captureVision: pipeline.captureVision ?? captureVision,
      inferredCaptureIntent,
    });
    onProgress?.({ phase: "save", progress: 100 });
    return result;
  }

  const intent = resolveOcrFallbackIntent({ ocr });

  if (!intent) {
    throw new Error("screenshot_no_intent");
  }

  if (intent.kind === "url" && intent.urls?.length) {
    return ingestPastedLinks(intent.urls.join("\n"));
  }

  const refinement =
    attachClientBehaviorKernel(ocr.refinement, intent) ?? ocr.refinement;

  if (isScreenshotConfirmRequired(refinement)) {
    onProgress?.({ phase: "confirm", progress: 100 });
    throw new ScreenshotConfirmRequired({
      file: prepared,
      intent,
      ocr: { ...ocr, refinement },
      refinement: refinement!,
      captureVision,
    });
  }

  onProgress?.({ phase: "save", progress: 90 });
  const result = await saveScreenshotIntent({
    file: prepared,
    originalFile: file,
    captureId,
    intent,
    ocr,
    captureVision,
  });
  onProgress?.({ phase: "save", progress: 100 });
  return result;
}

export function isScreenshotLink(link: LinkRow) {
  return link.source_type === "screenshot" || /rimvio\.app\/capture\//i.test(link.original_url);
}

export function isScreenshotCaptureError(
  error: unknown
): error is ScreenshotCaptureDetected {
  return error instanceof ScreenshotCaptureDetected;
}

export function isScreenshotPaymentError(
  error: unknown
): error is ScreenshotCaptureDetected {
  return error instanceof ScreenshotPaymentDetected || error instanceof ScreenshotCaptureDetected;
}

export function isScreenshotConfirmError(
  error: unknown
): error is ScreenshotConfirmRequired {
  return error instanceof ScreenshotConfirmRequired;
}
