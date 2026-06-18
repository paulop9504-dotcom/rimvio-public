import {
  toConfidenceBreakdown,
  type ConfidenceBreakdown,
  type ConfidenceState,
} from "@/lib/screenshot/confidence-state";
import {
  evaluateScreenshotGate as evaluateGate,
  resolveConfidence,
} from "@/lib/screenshot/resolve-confidence";
import {
  canAutoCommit,
  needsUserConfirm,
  shouldRunLlmRefine,
  type ConfidenceBand,
} from "@/lib/screenshot/transition-gate";
import type { ScreenshotIntent } from "@/lib/screenshot/classify-intent";
import type { VisionSnapshot } from "@/lib/vision/types";

export type { ConfidenceBreakdown, ConfidenceState, ConfidenceBand };
export type { SignalEntry } from "@/lib/screenshot/signal-ledger";
export { collectScreenshotSignals, resolveScreenshotSignals } from "@/lib/screenshot/collect-signals";
export {
  buildConfidenceState,
  toConfidenceBreakdown,
} from "@/lib/screenshot/confidence-state";
export {
  DETERMINISTIC_THRESHOLD,
  UNCERTAIN_THRESHOLD,
  resolveConfidenceBand,
  resolveConfidencePolicy,
  finalizeBandAfterLlm,
  shouldRunLlmRefine,
  needsUserConfirm,
  canAutoCommit,
} from "@/lib/screenshot/transition-gate";
export {
  evaluateScreenshotGate,
  resolveConfidence,
  mergeConfidenceTotal,
} from "@/lib/screenshot/resolve-confidence";

/** @deprecated Use ConfidenceBand */
export type TransitionBand = ConfidenceBand;

/** @deprecated Use ConfidenceState */
export type ScreenshotConfidence = ConfidenceBreakdown & {
  score: number;
  needsLlm: boolean;
  reason: string;
  band: ConfidenceBand;
  state: ConfidenceState;
};

export function assessScreenshotConfidence(input: {
  rawText: string;
  vision?: VisionSnapshot | null;
  intent?: ScreenshotIntent | null;
}): ScreenshotConfidence {
  const { state } = evaluateGate(input);
  const breakdown = toConfidenceBreakdown(state);

  return {
    ...breakdown,
    score: state.score,
    needsLlm: state.policy.runLlm,
    reason: state.primaryReason,
    band: state.band,
    state,
  };
}

/** @deprecated Use state.policy.runLlm */
export function shouldRefineWithLlm(confidence: Pick<ScreenshotConfidence, "band" | "state">) {
  if (confidence.state) {
    return confidence.state.policy.runLlm;
  }

  return shouldRunLlmRefine(confidence.band);
}
