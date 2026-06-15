export type SignalEntry = {
  id: string;
  delta: number;
  reason?: string;
};

/** Neutral prior — signals push score up or down from here. */
export const SIGNAL_BASE_SCORE = 50;

const REGEX_SIGNAL_IDS = new Set([
  "explicit_url",
  "place_keyword",
  "product_brand",
  "price_pattern",
  "address_fragment",
  "fluff_query",
  "instagram_noise",
  "instagram_noise_mild",
  "low_ocr_density",
  "no_intent",
  "weak_match",
  "generic_ui_text",
]);

const VISION_SIGNAL_IDS = new Set(["vision_label", "vision_fashion", "vision_entities"]);

const LLM_SIGNAL_IDS = new Set(["llm_refined", "llm_partial", "llm_empty"]);

export function clampConfidenceScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function sumSignalLedger(signals: SignalEntry[]) {
  const total = signals.reduce((sum, entry) => sum + entry.delta, SIGNAL_BASE_SCORE);
  return clampConfidenceScore(total);
}

export function topSignalReason(signals: SignalEntry[]) {
  if (signals.length === 0) {
    return "neutral";
  }

  const sorted = [...signals].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return sorted[0]?.id ?? "neutral";
}

export function rollupSignalSources(signals: SignalEntry[]) {
  const sumGroup = (ids: Set<string>) =>
    signals.filter((entry) => ids.has(entry.id)).reduce((sum, entry) => sum + entry.delta, 0);

  const regexDelta = sumGroup(REGEX_SIGNAL_IDS);
  const visionDelta = sumGroup(VISION_SIGNAL_IDS);
  const llmDelta = sumGroup(LLM_SIGNAL_IDS);

  const toUnit = (delta: number) =>
    Math.max(0, Math.min(1, Number(((SIGNAL_BASE_SCORE + delta) / 100).toFixed(3))));

  return {
    regex: toUnit(regexDelta),
    vision: toUnit(visionDelta),
    llm: llmDelta > 0 ? Math.max(0.35, Math.min(1, toUnit(llmDelta))) : 0,
  };
}

export function pushSignal(
  signals: SignalEntry[],
  entry: SignalEntry,
  options?: { exclusive?: string[] }
) {
  if (options?.exclusive?.includes(entry.id)) {
    return;
  }

  if (options?.exclusive) {
    for (const id of options.exclusive) {
      const index = signals.findIndex((signal) => signal.id === id);
      if (index >= 0) {
        signals.splice(index, 1);
      }
    }
  }

  signals.push(entry);
}
