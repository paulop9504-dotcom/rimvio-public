import { classifyAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { analyzeSemanticRouting } from "@/lib/action-chat/classify-semantic-routing-surface";
import { detectEntityOnlyInput } from "@/lib/event-kernel/entity/entity-action-surface";
import { inferContractAction } from "@/lib/event-kernel";
import { parseFindPlaceIntent } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import { isOpenAiConfigured } from "@/lib/llm/openai-config";
import { isVitalityStateUtterance } from "@/lib/vitality-state/classify-vitality-state-intent";
import { shouldActiveListeningBypass } from "@/lib/action-chat/adaptive-behavior/ux-guards/active-listening-bypass";

export function isLlmRouterEnabled(): boolean {
  if (!isOpenAiConfigured()) {
    return false;
  }
  const flag = process.env.RIMVIO_LLM_ROUTER?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") {
    return false;
  }
  return true;
}

/**
 * Invoke LLM router only for ambiguous or conversation-heavy turns.
 * High-confidence rule paths (meal contract, entity, vitality, anchor dining) skip LLM.
 */
export function shouldInvokeLlmRouter(message: string, routingMessage?: string): boolean {
  if (!isLlmRouterEnabled()) {
    return false;
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }

  if (isVitalityStateUtterance(trimmed)) {
    return false;
  }

  if (shouldActiveListeningBypass(trimmed)) {
    return false;
  }

  if (detectEntityOnlyInput(trimmed)) {
    return false;
  }

  const routeText = (routingMessage ?? trimmed).trim();
  if (inferContractAction(routeText) === "MEAL_RECOMMENDATION") {
    return false;
  }

  if (parseFindPlaceIntent(routeText)) {
    return false;
  }

  const semantic = analyzeSemanticRouting(trimmed);
  const aiCategory = classifyAiIntentUtterance(trimmed);

  if (semantic.multiIntent) {
    return true;
  }

  if (
    semantic.domain === "ambiguous" ||
    semantic.reason === "minimal_ambiguous" ||
    semantic.reason === "ambiguous_fallback"
  ) {
    return true;
  }

  if (semantic.forbidInfo && !aiCategory) {
    return true;
  }

  if (
    aiCategory === "DECISION" ||
    aiCategory === "COUNSELING" ||
    aiCategory === "HOW_TO"
  ) {
    return true;
  }

  if (semantic.forbidInfo && aiCategory === "INFO") {
    return true;
  }

  return false;
}
