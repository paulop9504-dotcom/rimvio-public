export type ConfidenceBand = "deterministic" | "assistive" | "uncertain";

/** @deprecated Use ConfidenceBand */
export type TransitionBand = ConfidenceBand;

export const DETERMINISTIC_THRESHOLD = 80;
export const UNCERTAIN_THRESHOLD = 50;

/** @deprecated */
export const COMMIT_THRESHOLD = DETERMINISTIC_THRESHOLD / 100;
/** @deprecated */
export const CONFIRM_THRESHOLD = UNCERTAIN_THRESHOLD / 100;

export type ConfidencePolicy = {
  runLlm: boolean;
  needsConfirm: boolean;
  canAutoCommit: boolean;
};

export function resolveConfidenceBand(score: number): ConfidenceBand {
  if (score >= DETERMINISTIC_THRESHOLD) {
    return "deterministic";
  }

  if (score >= UNCERTAIN_THRESHOLD) {
    return "assistive";
  }

  return "uncertain";
}

/** @deprecated Use resolveConfidenceBand(score) */
export function resolveTransitionBand(cTotal: number): ConfidenceBand {
  return resolveConfidenceBand(Math.round(cTotal * 100));
}

export function resolveConfidencePolicy(band: ConfidenceBand): ConfidencePolicy {
  switch (band) {
    case "deterministic":
      return {
        runLlm: false,
        needsConfirm: false,
        canAutoCommit: true,
      };
    case "assistive":
      return {
        runLlm: true,
        needsConfirm: false,
        canAutoCommit: true,
      };
    case "uncertain":
      return {
        runLlm: true,
        needsConfirm: true,
        canAutoCommit: false,
      };
  }
}

export function shouldRunLlmRefine(band: ConfidenceBand) {
  return resolveConfidencePolicy(band).runLlm;
}

export function canAutoCommit(band: ConfidenceBand) {
  return resolveConfidencePolicy(band).canAutoCommit;
}

export function needsUserConfirm(band: ConfidenceBand) {
  return resolveConfidencePolicy(band).needsConfirm;
}

/**
 * Post-LLM band finalization.
 *
 * assistive + LLM fail → demote to uncertain (confirm strip)
 * assistive + LLM ok + score still < 50 → uncertain
 * otherwise use score band
 */
export function finalizeBandAfterLlm(input: {
  preBand: ConfidenceBand;
  postScore: number;
  llmSucceeded: boolean;
}): ConfidenceBand {
  const postBand = resolveConfidenceBand(input.postScore);

  if (input.preBand === "assistive" && !input.llmSucceeded) {
    return "uncertain";
  }

  if (input.preBand === "assistive" && postBand === "uncertain") {
    return "uncertain";
  }

  if (input.preBand === "uncertain" && postBand === "assistive" && input.llmSucceeded) {
    return "assistive";
  }

  return postBand;
}

/** @deprecated */
export function bandLegacyAlias(band: ConfidenceBand): "commit" | "shadow" | "confirm" {
  if (band === "deterministic") return "commit";
  if (band === "assistive") return "shadow";
  return "confirm";
}

/** @deprecated */
export function bandFromLegacyAlias(
  band: "commit" | "shadow" | "confirm" | ConfidenceBand
): ConfidenceBand {
  if (band === "commit") return "deterministic";
  if (band === "shadow") return "assistive";
  if (band === "confirm") return "uncertain";
  return band;
}
