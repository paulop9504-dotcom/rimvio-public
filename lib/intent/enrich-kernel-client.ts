"use client";

import { buildIntentKernel } from "@/lib/intent/build-intent-kernel";
import { readSaveTrajectory } from "@/lib/intent/save-trajectory-client";
import type { ScreenshotIntent } from "@/lib/screenshot/classify-intent";
import type { OcrRefinement } from "@/lib/screenshot/refine-ocr-llm";

function categoryForIntent(intent: ScreenshotIntent) {
  if (intent.kind === "place" || intent.kind === "address" || intent.kind === "travel_booking") {
    return "travel";
  }

  if (intent.kind === "product" || intent.kind === "receipt") {
    return "shopping";
  }

  if (intent.kind === "menu_food") {
    return "food";
  }

  return "uncategorized";
}

export function attachClientBehaviorKernel(
  refinement: OcrRefinement | null | undefined,
  intent: ScreenshotIntent
): OcrRefinement | null | undefined {
  if (!refinement?.state) {
    return refinement;
  }

  const kernel = buildIntentKernel({
    state: refinement.state,
    intent,
    behavior: {
      saveHistory: readSaveTrajectory(),
      hour: new Date().getHours(),
      current: {
        query: intent.query ?? null,
        title: intent.query ?? null,
        category: categoryForIntent(intent),
      },
    },
    llmInvoked: refinement.kernel?.llm.invoked ?? refinement.source === "llm",
    llmSource: refinement.source,
  });

  return { ...refinement, kernel };
}
