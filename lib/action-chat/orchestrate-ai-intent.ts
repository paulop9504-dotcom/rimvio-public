import {

  classifyAiIntentUtterance,

  type AiIntentCategory,

} from "@/lib/action-chat/classify-ai-intent-utterance";

import { analyzeSemanticRouting } from "@/lib/action-chat/classify-semantic-routing-surface";

import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";

import { buildTikiTakaOfflineReply } from "@/lib/action-chat/tiki-taka-dialogue-prompt";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import { buildSimplifyModeReply } from "@/lib/action-chat/adaptive-behavior/build-simplify-reply";
import { adaptiveMetadataFields } from "@/lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import { buildActiveListeningReply } from "@/lib/action-chat/adaptive-behavior/ux-guards/active-listening-bypass";
import {
  applyCraftToReply,
  buildCraftTikiOfflineReply,
} from "@/lib/action-chat/conversation-craft/build-craft-reply";



const RULE_STUB: Record<AiIntentCategory, string | null> = {

  INFO: "어떤 부분이 궁금하신지 알려주시면 쉽게 풀어서 설명해 드릴게요.",

  HOW_TO: null,

  DECISION: null,

  CREATION: "어떤 톤과 분량으로 쓸지 알려주시면 바로 초안을 만들어 드릴게요.",

  COUNSELING: null,

  CURIOSITY:

    "저는 Rimvio예요. 질문에 맞춰 설명·실행·정리를 도와드리는 AI 도우미입니다. 궁금한 점을 말씀해 주세요.",

};



function resolveStubSummary(
  category: AiIntentCategory,
  message: string,
  adaptive?: AdaptiveBehaviorContext
): string {

  const useSimplifyReply =
    adaptive &&
    (adaptive.autoDecide ||
      adaptive.decisionFatigue ||
      (adaptive.simplifyMode && adaptive.vitalityStates.includes("overload")));

  if (adaptive?.ux.activeListening) {
    return buildActiveListeningReply(message);
  }

  if (useSimplifyReply) {
    return buildSimplifyModeReply({
      message,
      category,
      hiddenIntents: adaptive.hiddenIntents,
      vitalityStates: adaptive.vitalityStates,
      routingHint: adaptive.routingHint,
      autoDecide: adaptive.autoDecide,
    });
  }

  const fixed = RULE_STUB[category];

  if (fixed) {

    return fixed;

  }

  const craftReply =
    adaptive &&
    buildCraftTikiOfflineReply(message, category, adaptive.craft, adaptive.vitalityStates);
  if (craftReply) {
    return applyCraftToReply(craftReply, adaptive!.craft, message);
  }

  const base = buildTikiTakaOfflineReply(message, category);
  return adaptive ? applyCraftToReply(base, adaptive.craft, message) : base;

}



function buildAiIntentResult(

  category: AiIntentCategory,

  semanticReason: string,

  message: string,

  adaptive?: AdaptiveBehaviorContext

): OrchestratorResult {

  return {

    summary: resolveStubSummary(category, message, adaptive),

    actions: [],

    source: "conversation",

    confidence: 0.82,

    disclosure: "none",

    actionsRevealed: false,

    pendingConfirm: false,

    presentation: { mode: "conversation" },

    metadata: adaptiveMetadataFields(adaptive, {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      ai_intent: category,
      semantic_reason: semanticReason,
    }) as OrchestratorResult["metadata"],

  };

}



export type OrchestrateAiIntentOptions = {
  adaptive?: AdaptiveBehaviorContext;
};



/** Deterministic conversational stub when LLM is unavailable or as tier-5 fast path. */

export function orchestrateAiIntent(
  message: string,
  options?: OrchestrateAiIntentOptions
): OrchestratorResult | null {

  const adaptive = options?.adaptive;
  const semantic = analyzeSemanticRouting(message);

  const category = classifyAiIntentUtterance(message);



  if (!category && (semantic.domain === "travel" || semantic.domain === "schedule")) {

    return null;

  }



  if (!category) {

    if (!semantic.forbidInfo) {

      return null;

    }

    const surface = semantic.expected[0];

    if (surface === "FORK") {

      if (
        semantic.domain === "food" ||
        semantic.domain === "housing" ||
        semantic.domain === "travel" ||
        semantic.domain === "schedule"
      ) {

        return null;

      }

      return buildAiIntentResult("DECISION", semantic.reason, message, adaptive);

    }

    const stubKey =

      surface === "STEP"

        ? "HOW_TO"

        : surface === "DECISION"

          ? "DECISION"

          : surface === "REFLECT"

            ? "COUNSELING"

            : surface === "ARTIFACT"

              ? "CREATION"

              : null;

    if (!stubKey) {

      return null;

    }

    return buildAiIntentResult(stubKey, semantic.reason, message, adaptive);

  }



  if (semantic.forbidInfo && category === "INFO") {

    return null;

  }



  return buildAiIntentResult(category, semantic.reason, message, adaptive);

}


