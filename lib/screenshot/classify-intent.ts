import type { CaptureIntent, CaptureIntentKind } from "@/lib/capture/capture-intent-types";
import { detectCaptureIntent } from "@/lib/capture/detect-capture-intent";

export type ScreenshotIntentKind = CaptureIntentKind;
export type ScreenshotIntent = CaptureIntent;

export type ScreenshotClassifyInput = {
  text: string;
  vision?: {
    bestGuessLabels?: string[];
    webEntities?: string[];
    labels?: string[];
    fashionScore?: number;
  } | null;
};

export function classifyScreenshotText(rawText: string): ScreenshotIntent | null {
  return classifyScreenshotInput({ text: rawText });
}

export function classifyScreenshotInput(
  input: ScreenshotClassifyInput
): ScreenshotIntent | null {
  return detectCaptureIntent(input);
}
