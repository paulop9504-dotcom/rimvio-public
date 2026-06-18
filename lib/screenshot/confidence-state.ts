import type { SignalEntry } from "@/lib/screenshot/signal-ledger";
import {
  resolveConfidenceBand,
  resolveConfidencePolicy,
  type ConfidenceBand,
  type ConfidencePolicy,
} from "@/lib/screenshot/transition-gate";

export type ConfidenceSources = {
  regex: number;
  vision: number;
  llm: number;
};

/** @deprecated Use ConfidenceState.score (0–100) */
export type ConfidenceBreakdown = {
  cRegex: number;
  cVision: number;
  cLlm: number;
  cTotal: number;
  reason: string;
};

export type ConfidenceState = {
  score: number;
  band: ConfidenceBand;
  signals: SignalEntry[];
  primaryReason: string;
  sources: ConfidenceSources;
  policy: ConfidencePolicy;
};

export function toConfidenceBreakdown(state: ConfidenceState): ConfidenceBreakdown {
  return {
    cRegex: state.sources.regex,
    cVision: state.sources.vision,
    cLlm: state.sources.llm,
    cTotal: Number((state.score / 100).toFixed(3)),
    reason: state.primaryReason,
  };
}

export function buildConfidenceState(input: {
  score: number;
  signals: SignalEntry[];
  primaryReason: string;
  sources: ConfidenceSources;
  band?: ConfidenceBand;
}): ConfidenceState {
  const band = input.band ?? resolveConfidenceBand(input.score);
  return {
    score: input.score,
    band,
    signals: input.signals,
    primaryReason: input.primaryReason,
    sources: input.sources,
    policy: resolveConfidencePolicy(band),
  };
}
