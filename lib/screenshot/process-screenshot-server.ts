import {

  buildScreenshotActions,

  screenshotLinkCategory,

  screenshotLinkTitle,

} from "@/lib/screenshot/build-screenshot-actions";

import { isScreenshotConfirmRequired } from "@/lib/screenshot/refine-ocr-llm";

import { processCaptureImageBuffer } from "@/lib/capture/process-capture-image";

import type { CapturePayload } from "@/lib/screenshot/capture-types";

import { createCaptureToken } from "@/lib/server/capture-cache";



const MAX_IMAGE_BYTES = 8 * 1024 * 1024;



function toDataUrl(buffer: Buffer, mimeType: string) {

  return `data:${mimeType};base64,${buffer.toString("base64")}`;

}



export async function processScreenshotBuffer(input: {

  buffer: Buffer;

  mimeType: string;

}) {

  if (input.buffer.byteLength > MAX_IMAGE_BYTES) {

    throw new Error("image_too_large");

  }



  const processed = await processCaptureImageBuffer(input);



  if (!processed.ocr.intent) {

    throw new Error("screenshot_no_intent");

  }



  if (

    isScreenshotConfirmRequired(processed.ocr.refinement) &&

    !processed.ocr.intent.query?.trim()

  ) {

    throw new Error("screenshot_no_intent");

  }



  return {

    ocr: processed.ocr,

    thumbnailDataUrl: toDataUrl(input.buffer, input.mimeType || "image/jpeg"),

  };

}



export async function buildCapturePayload(input: {

  buffer: Buffer;

  mimeType: string;

}): Promise<CapturePayload> {

  if (input.buffer.byteLength > MAX_IMAGE_BYTES) {

    throw new Error("image_too_large");

  }



  const processed = await processCaptureImageBuffer(input);

  const id = createCaptureToken();

  const thumbnailDataUrl = toDataUrl(input.buffer, input.mimeType || "image/jpeg");



  if (processed.pipeline.source === "vision") {

    const actionOptions = {

      captureVision: processed.pipeline.captureVision,

      vision: processed.ocr.vision,

      inferredCaptureIntent: processed.pipeline.inferredCaptureIntent,

    };



    return {

      id,

      storedAt: Date.now(),

      thumbnailDataUrl,

      ocrText: processed.ocr.text,

      provider: processed.ocr.provider,

      vision: processed.ocr.vision,

      intent: processed.pipeline.intent,

      title: screenshotLinkTitle(processed.pipeline.intent, actionOptions),

      category: screenshotLinkCategory(processed.pipeline.intent, actionOptions),

      actions: buildScreenshotActions(processed.pipeline.intent, actionOptions),

    };

  }



  const intent = processed.ocr.intent;

  if (!intent) {

    throw new Error("screenshot_no_intent");

  }



  if (isScreenshotConfirmRequired(processed.ocr.refinement) && !intent.query?.trim()) {

    throw new Error("screenshot_no_intent");

  }



  const actionOptions = {

    captureVision: processed.captureVision,

    vision: processed.ocr.vision,

  };



  return {

    id,

    storedAt: Date.now(),

    thumbnailDataUrl,

    ocrText: processed.ocr.text,

    provider: processed.ocr.provider,

    vision: processed.ocr.vision,

    refinement: processed.ocr.refinement,

    intent,

    title: screenshotLinkTitle(intent, actionOptions),

    category: screenshotLinkCategory(intent, actionOptions),

    actions: buildScreenshotActions(intent, actionOptions),

  };

}


