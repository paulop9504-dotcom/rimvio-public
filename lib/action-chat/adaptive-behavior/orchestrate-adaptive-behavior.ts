import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import { classifyAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import {
  buildSimplifyContextClarify,
  buildSimplifyModeReply,
} from "@/lib/action-chat/adaptive-behavior/build-simplify-reply";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import {
  adaptiveMetadataFields,
  resolveAdaptiveBehaviorContext,
} from "@/lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import { toMealDiscoveryQuery } from "@/lib/event-kernel/execution-planner/to-meal-discovery-query";

function buildSimplifyConversationResult(
  summary: string,
  adaptive: AdaptiveBehaviorContext,
  reason: string
): OrchestratorResult {
  return {
    summary,
    actions: [],
    source: "conversation",
    confidence: 0.86,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: adaptiveMetadataFields(adaptive, {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      ai_intent: "DECISION",
      semantic_reason: reason,
      routing_patch: "ADAPTIVE_SIMPLIFY",
    }) as OrchestratorResult["metadata"],
  };
}

export async function orchestrateAdaptiveSimplifyRoute(input: {
  message: string;
  history?: readonly OrchestrateHistoryTurn[];
  chatAxis?: ChatAxis;
  adaptive?: AdaptiveBehaviorContext;
  priorIntent?: string;
}): Promise<OrchestratorResult | null> {
  const adaptive =
    input.adaptive ??
    resolveAdaptiveBehaviorContext({
      message: input.message,
      history: input.history,
      chatAxis: input.chatAxis,
    });

  if (!adaptive.shouldPreemptTiki) {
    return null;
  }

  const category = classifyAiIntentUtterance(input.message);
  const wantsFood =
    adaptive.routingHint === "FOOD" ||
    adaptive.routingHint === "FOOD_DECISION_MIX" ||
    input.chatAxis === "meal" ||
    /(?:먹|맛집|배고)/iu.test(input.message);

  if (wantsFood && (adaptive.autoDecide || adaptive.decisionFatigue)) {
    const query = toMealDiscoveryQuery(input.message || "무난한 맛집");
    const discovery = await orchestratePlaceRecommendation(query, {
      history: input.history,
    });
    if (discovery) {
      return {
        ...discovery,
        summary: `${buildSimplifyModeReply({
          message: input.message,
          category,
          hiddenIntents: adaptive.hiddenIntents,
          vitalityStates: adaptive.vitalityStates,
          routingHint: adaptive.routingHint,
          autoDecide: adaptive.autoDecide,
          priorIntent: input.priorIntent,
        })}\n\n${discovery.summary ?? ""}`.trim(),
        metadata: adaptiveMetadataFields(adaptive, {
          ...discovery.metadata,
          routing_patch: "ADAPTIVE_AUTO_DECIDE_MEAL",
        }) as OrchestratorResult["metadata"],
      };
    }
  }

  const summary = input.priorIntent
    ? buildSimplifyContextClarify({
        priorIntent: input.priorIntent,
        confidence: 0.55,
      })
    : buildSimplifyModeReply({
        message: input.message,
        category,
        hiddenIntents: adaptive.hiddenIntents,
        vitalityStates: adaptive.vitalityStates,
        routingHint: adaptive.routingHint,
        autoDecide: adaptive.autoDecide,
        priorIntent: input.priorIntent,
      });

  return buildSimplifyConversationResult(
    summary,
    adaptive,
    adaptive.autoDecide ? "auto_decide" : "decision_fatigue"
  );
}

export { resolveAdaptiveBehaviorContext, adaptiveMetadataFields };
