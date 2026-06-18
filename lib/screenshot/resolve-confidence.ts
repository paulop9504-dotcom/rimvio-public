import {
  buildConfidenceState,
  toConfidenceBreakdown,
  type ConfidenceBreakdown,
  type ConfidenceState,
} from "@/lib/screenshot/confidence-state";
import { resolveScreenshotSignals } from "@/lib/screenshot/collect-signals";
import type { ScreenshotIntent } from "@/lib/screenshot/classify-intent";
import type { VisionSnapshot } from "@/lib/vision/types";

export type { ConfidenceBreakdown, ConfidenceState };
export { buildConfidenceState, toConfidenceBreakdown };

/** @deprecated Use buildConfidenceState via evaluateScreenshotGate */
export const CONFIDENCE_W_REGEX = 0.35;
/** @deprecated */
export const CONFIDENCE_W_VISION = 0.35;
/** @deprecated */
export const CONFIDENCE_W_LLM = 0.3;

/** @deprecated Use collectScreenshotSignals + scoreFromSignals */
export function scoreRegexConfidence(input: {
  rawText: string;
  intent?: ScreenshotIntent | null;
}) {
  const scored = resolveScreenshotSignals({
    rawText: input.rawText,
    intent: input.intent,
  });
  return { score: scored.sources.regex, reason: scored.primaryReason };
}

/** @deprecated */
export function scoreVisionConfidence(input: {
  vision?: VisionSnapshot | null;
  intent?: ScreenshotIntent | null;
}) {
  const scored = resolveScreenshotSignals({
    rawText: "",
    vision: input.vision,
    intent: input.intent,
  });
  return scored.sources.vision;
}

/** @deprecated */
export function scoreLlmConfidence(
  refinement?: { source: "llm" | "skipped"; query?: string; kind?: string } | null
) {
  const scored = resolveScreenshotSignals({
    rawText: "",
    llmRefinement: refinement,
  });
  return scored.sources.llm;
}

/** @deprecated Use signal ledger score (0–100) / 100 */
export function mergeConfidenceTotal(input: {
  cRegex: number;
  cVision: number;
  cLlm: number;
}) {
  if (input.cLlm > 0) {
    return Math.max(
      0,
      Math.min(
        1,
        CONFIDENCE_W_REGEX * input.cRegex +
          CONFIDENCE_W_VISION * input.cVision +
          CONFIDENCE_W_LLM * input.cLlm
      )
    );
  }

  if (input.cVision > 0) {
    return Math.max(0, Math.min(1, 0.55 * input.cRegex + 0.45 * input.cVision));
  }

  return Math.max(0, Math.min(1, input.cRegex));
}

/** @deprecated Use evaluateScreenshotGate().state */
export function resolveConfidence(input: {
  rawText: string;
  vision?: VisionSnapshot | null;
  intent?: ScreenshotIntent | null;
  llmRefinement?: { source: "llm" | "skipped"; query?: string; kind?: string } | null;
}): ConfidenceBreakdown {
  return toConfidenceBreakdown(evaluateScreenshotGate(input).state);
}

export function evaluateScreenshotGate(input: {
  rawText: string;
  vision?: VisionSnapshot | null;
  intent?: ScreenshotIntent | null;
  llmRefinement?: { source: "llm" | "skipped"; query?: string; kind?: string } | null;
  band?: import("@/lib/screenshot/transition-gate").ConfidenceBand;
}): { state: ConfidenceState } {
  const scored = resolveScreenshotSignals(input);
  const state = buildConfidenceState({
    score: scored.score,
    signals: scored.signals,
    primaryReason: scored.primaryReason,
    sources: scored.sources,
    band: input.band,
  });

  return { state };
}
