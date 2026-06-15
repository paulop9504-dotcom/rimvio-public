import type { AbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import type {
  ConversationStage,
  PersonaContext,
  PersonaResultHint,
  PersonaToneMode,
} from "@/lib/action-chat/adaptive-persona/types";

const HIGH_STRESS_VITALITY = new Set([
  "overload",
  "anxiety",
  "energy_depletion",
  "sleepiness",
]);

function inferStage(
  mode: PersonaToneMode,
  adaptive?: AdaptiveBehaviorContext
): ConversationStage {
  if (mode === "vitality" || adaptive?.ux.activeListening) {
    return "counseling";
  }
  if (mode === "execution") {
    return "execution";
  }
  if (adaptive?.shouldPreemptTiki || adaptive?.decisionFatigue) {
    return "decision";
  }
  return "exploration";
}

function isExecutionReady(
  abstraction: AbstractionLevel,
  hint?: PersonaResultHint
): boolean {
  if (hint?.source === "rules") {
    return true;
  }
  if (hint?.intent === "ACTION" || hint?.intent === "SCHEDULE") {
    return true;
  }
  if (hint?.pendingConfirm || hint?.actionsRevealed) {
    return true;
  }
  if (abstraction === "L3" || abstraction === "L4") {
    return true;
  }
  return Boolean(hint?.hasActions && hint.source !== "conversation");
}

function isVitalityTone(adaptive?: AdaptiveBehaviorContext): boolean {
  if (!adaptive) {
    return false;
  }
  if (adaptive.ux.activeListening || adaptive.ux.frustrationEscape) {
    return true;
  }
  if (adaptive.abstractionLevel === "L0") {
    return true;
  }
  return adaptive.vitalityStates.some((state) => HIGH_STRESS_VITALITY.has(state));
}

/**
 * Pure read — selects tone mode from adaptive context + result hints.
 * Does NOT route or mutate canonical state.
 */
export function resolvePersonaContext(input: {
  adaptive?: AdaptiveBehaviorContext;
  resultHint?: PersonaResultHint;
}): PersonaContext {
  const adaptive = input.adaptive;
  const abstraction = adaptive?.abstractionLevel ?? "L1";
  const hint = input.resultHint;

  let mode: PersonaToneMode = "tiki_taka";

  if (isExecutionReady(abstraction, hint) && !adaptive?.ux.activeListening) {
    mode = "execution";
  } else if (isVitalityTone(adaptive)) {
    mode = "vitality";
  } else if (
    (abstraction === "L0" || abstraction === "L1" || abstraction === "L2") &&
    !hint?.pendingConfirm
  ) {
    mode = "tiki_taka";
  }

  if (
    adaptive?.ux.activeListening &&
    hint?.source !== "rules" &&
    !hint?.pendingConfirm
  ) {
    mode = "vitality";
  }

  return {
    mode,
    stage: inferStage(mode, adaptive),
  };
}

export function resolvePersonaToneMode(input: {
  adaptive?: AdaptiveBehaviorContext;
  resultHint?: PersonaResultHint;
}): PersonaToneMode {
  return resolvePersonaContext(input).mode;
}
