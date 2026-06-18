import { orchestrateAiIntent } from "@/lib/action-chat/orchestrate-ai-intent";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import { isMealAxisAmbiguousPhrase } from "@/lib/action-chat/chat-three-axis";
import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import { isVitalityGateLexiconMatch } from "@/lib/vitality-state/vitality-state-gate-lexicon";

/** Hard override — never route to FOOD/meal from these alone. */
const DECISION_FORCE_EXACT =
  /^(?:뭐\s*하지|추천|어떡해|그냥|모르겠어|모르겠|어떡하지|모르겠어요|그냥\s*답답)$/iu;

const DECISION_FORCE_PREFIX =
  /^(?:뭐\s*하지|추천|어떡해|그냥(?:\s+답답)?|모르겠)/iu;

/**
 * PATCH 1 — boundary inputs must route to DECISION, not FOOD/vitality fork.
 * Keyword list takes priority over vitality lexicon (e.g. "뭐하지").
 */
export function shouldForceDecisionRoute(
  message: string,
  chatAxis?: ChatAxis
): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;

  if (chatAxis === "meal" && isMealAxisAmbiguousPhrase(trimmed)) {
    return false;
  }

  if (chatAxis === "schedule") {
    return false;
  }

  if (DECISION_FORCE_EXACT.test(trimmed) || DECISION_FORCE_PREFIX.test(trimmed)) {
    return chatAxis !== "meal";
  }

  if (isVitalityGateLexiconMatch(trimmed)) {
    return false;
  }

  return false;
}

export function orchestrateDecisionPriorityOverride(
  message: string,
  chatAxis?: ChatAxis,
  adaptive?: AdaptiveBehaviorContext
): OrchestratorResult | null {
  if (!shouldForceDecisionRoute(message, chatAxis)) {
    return null;
  }

  const result = orchestrateAiIntent(message, { adaptive });
  if (!result) {
    return null;
  }

  return {
    ...result,
    metadata: mergeOrchestratorMetadata(result.metadata, {
      ...(chatAxis ? { chat_axis: chatAxis, chat_axis_route: "decision_force" } : {}),
      ai_intent: "DECISION",
      semantic_reason: "decision_priority_override",
      routing_patch: "PATCH1_DECISION_FORCE",
    }),
  };
}
