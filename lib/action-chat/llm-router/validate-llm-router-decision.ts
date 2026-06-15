import { analyzeSemanticRouting } from "@/lib/action-chat/classify-semantic-routing-surface";
import type { LlmRouterDecision } from "@/lib/action-chat/llm-router/llm-router-types";

export type ValidatedLlmRouterDecision = LlmRouterDecision & {
  adjusted: boolean;
};

const MEAL_HINT =
  /(?:먹|맛집|배달|배고|점심|저녁|식사|메뉴|카페\s*추천|식당)/iu;

const MIN_CONFIDENCE = 0.55;

/** Rule guardrail on LLM router output — forbidInfo traps, meal overrides, low confidence. */
export function validateLlmRouterDecision(
  message: string,
  decision: LlmRouterDecision
): ValidatedLlmRouterDecision | null {
  const semantic = analyzeSemanticRouting(message);
  let adjusted = false;
  let next: LlmRouterDecision = { ...decision };

  if (decision.confidence < MIN_CONFIDENCE) {
    return null;
  }

  if (semantic.forbidInfo && next.primary_intent === "INFO") {
    next = {
      ...next,
      primary_intent: semantic.domain === "food" ? "MEAL" : "DECISION",
      executor: semantic.domain === "food" ? "MEAL" : "CONVERSATION",
      forbid_info_fallback: true,
      reason: `${next.reason}|guard_forbid_info`,
    };
    adjusted = true;
  }

  if (MEAL_HINT.test(message) && next.primary_intent === "INFO") {
    next = {
      ...next,
      primary_intent: "MEAL",
      executor: "MEAL",
      forbid_info_fallback: true,
      reason: `${next.reason}|guard_meal_hint`,
    };
    adjusted = true;
  }

  if (
    next.executor === "CONVERSATION" &&
    next.forbid_info_fallback &&
    next.primary_intent === "INFO"
  ) {
    next = {
      ...next,
      primary_intent: "DECISION",
      reason: `${next.reason}|guard_info_to_decision`,
    };
    adjusted = true;
  }

  return { ...next, adjusted };
}
