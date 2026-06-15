import {
  classifyScreenshotInput,
  type ScreenshotIntent,
} from "@/lib/screenshot/classify-intent";
import {
  refineOcrWithLlm,
  type OcrRefinement,
} from "@/lib/screenshot/refine-ocr-llm";
import type { VisionSnapshot } from "@/lib/vision/types";

export function applyOcrRefinement(
  intent: ScreenshotIntent,
  refinement: OcrRefinement | null | undefined
): ScreenshotIntent {
  if (!refinement?.query || !refinement.kind) {
    return intent;
  }

  if (intent.kind === "url") {
    return intent;
  }

  return {
    ...intent,
    kind: refinement.kind,
    query: refinement.query,
    ocrText: intent.ocrText,
  };
}

export async function resolveScreenshotIntent(input: {
  text: string;
  vision?: VisionSnapshot | null;
}): Promise<{
  intent: ScreenshotIntent | null;
  refinement: OcrRefinement;
}> {
  const refinement = await refineOcrWithLlm({
    rawText: input.text,
    vision: input.vision,
  });

  const classifyText =
    refinement.query && refinement.kind ? refinement.query : input.text;

  const intent = classifyScreenshotInput({
    text: classifyText,
    vision: input.vision,
  });

  if (!intent) {
    return { intent: null, refinement };
  }

  return {
    intent: applyOcrRefinement(intent, refinement),
    refinement,
  };
}
