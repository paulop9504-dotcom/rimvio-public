import { classifyAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import { isLowAbstractionLevel } from "@/lib/action-chat/classify-abstraction-level";
import { analyzeSemanticRouting } from "@/lib/action-chat/classify-semantic-routing-surface";
import { classifyAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { isDecisionAvoidanceInput } from "@/lib/action-chat/adaptive-behavior/detect-decision-avoidance";
import { detectDecisionFatigue } from "@/lib/action-chat/adaptive-behavior/detect-decision-fatigue";
import { detectVitalitySignals } from "@/lib/action-chat/adaptive-behavior/detect-vitality-signals";
import { inferHiddenIntents } from "@/lib/action-chat/adaptive-behavior/infer-hidden-intent";
import {
  resolveVitalityRoutingBias,
  type VitalityRoutingBias,
} from "@/lib/action-chat/adaptive-behavior/vitality-routing-bias";
import type {
  AdaptiveBehaviorContext,
  AdaptiveBehaviorInput,
} from "@/lib/action-chat/adaptive-behavior/types";
import {
  detectFrustrationEscape,
} from "@/lib/action-chat/adaptive-behavior/ux-guards/frustration-circuit-breaker";
import {
  isMidThoughtPivot,
  stripMidThoughtPivot,
} from "@/lib/action-chat/adaptive-behavior/ux-guards/mid-thought-pivot";
import { shouldActiveListeningBypass } from "@/lib/action-chat/adaptive-behavior/ux-guards/active-listening-bypass";
import { resolveEffectiveVitalityStates } from "@/lib/action-chat/adaptive-behavior/ux-guards/vitality-state-decay";
import { resolvePrecisionAffordance } from "@/lib/action-chat/adaptive-behavior/ux-guards/precision-affordance";
import type { UxGuardFlags } from "@/lib/action-chat/adaptive-behavior/ux-guards/types";
import { EMPTY_UX_FLAGS } from "@/lib/action-chat/adaptive-behavior/ux-guards/types";
import { resolveConversationCraft } from "@/lib/action-chat/conversation-craft/detect-craft-signals";
import { craftMetadataFields } from "@/lib/action-chat/conversation-craft/apply-craft-presentation";

export function resolveAdaptiveBehaviorContext(
  input: AdaptiveBehaviorInput
): AdaptiveBehaviorContext {
  const rawMessage = input.message.trim();
  const pivot = isMidThoughtPivot(rawMessage);
  const effectiveMessage = pivot ? stripMidThoughtPivot(rawMessage) || rawMessage : rawMessage;

  const abstraction = classifyAbstractionLevel(effectiveMessage);
  const hiddenIntents = inferHiddenIntents(effectiveMessage, abstraction);
  const currentVitality = detectVitalitySignals(effectiveMessage);
  const vitalityStates = resolveEffectiveVitalityStates({
    current: currentVitality,
    memory: input.vitalityMemory,
    message: effectiveMessage,
  });
  const vitalityBias = resolveVitalityRoutingBias({ vitalityStates, hiddenIntents });
  const autoDecide = isDecisionAvoidanceInput(effectiveMessage);
  const decisionFatigue = detectDecisionFatigue(effectiveMessage, input.history);
  const semantic = analyzeSemanticRouting(effectiveMessage);
  const frustrationEscape = detectFrustrationEscape(rawMessage, input.history);
  const activeListening = shouldActiveListeningBypass(effectiveMessage);

  const simplifyFromAbstraction =
    isLowAbstractionLevel(abstraction.level) &&
    (vitalityStates.includes("overload") ||
      semantic.domain === "ambiguous" ||
      semantic.reason === "minimal_ambiguous");

  const simplifyMode =
    frustrationEscape ||
    activeListening ||
    autoDecide ||
    decisionFatigue ||
    simplifyFromAbstraction ||
    vitalityBias.simplifyBoost >= 0.8;

  const shouldPreemptTiki =
    frustrationEscape ||
    autoDecide ||
    decisionFatigue ||
    (simplifyFromAbstraction && vitalityStates.includes("overload"));

  let routingHint = vitalityBias.hint;
  if (input.chatAxis === "meal") {
    routingHint = routingHint === "FOOD_DECISION_MIX" ? "FOOD_DECISION_MIX" : "FOOD";
  } else if (input.chatAxis === "schedule") {
    routingHint = "SCHEDULE";
  }

  const aiIntent = classifyAiIntentUtterance(effectiveMessage);
  const ux: UxGuardFlags = {
    frustrationEscape,
    midThoughtPivot: pivot,
    contextFlushed: pivot,
    activeListening,
    simplifyMode,
    precisionAffordance: resolvePrecisionAffordance({
      abstractionLevel: abstraction.level,
      ux: {
        frustrationEscape,
        midThoughtPivot: pivot,
        contextFlushed: pivot,
        activeListening,
        simplifyMode,
        precisionAffordance: "minimal",
        progressiveDisclosure: !isLowAbstractionLevel(abstraction.level),
      },
      aiIntent,
    }),
    progressiveDisclosure: !isLowAbstractionLevel(abstraction.level),
  };

  return {
    abstractionLevel: abstraction.level,
    hiddenIntents,
    vitalityStates,
    autoDecide,
    decisionFatigue,
    simplifyMode,
    routingHint,
    shouldPreemptTiki,
    effectiveMessage,
    ux,
    craft: resolveConversationCraft({
      message: effectiveMessage,
      history: input.history,
      adaptive: {
        abstractionLevel: abstraction.level,
        hiddenIntents,
        vitalityStates,
        autoDecide,
        decisionFatigue,
        shouldPreemptTiki,
        routingHint,
        ux,
      },
      existingSchedule: input.existingSchedule,
      referenceDate: input.referenceDate,
    }),
  };
}

export function adaptiveMetadataFields(
  adaptive: AdaptiveBehaviorContext | undefined,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  if (!adaptive) {
    return { ...extra, adaptive_layer: "v2" };
  }
  const ux = adaptive.ux ?? EMPTY_UX_FLAGS;
  return {
    ...extra,
    adaptive_layer: "v2",
    abstraction_level: adaptive.abstractionLevel,
    hidden_intents: adaptive.hiddenIntents,
    vitality_states: adaptive.vitalityStates,
    auto_decide: adaptive.autoDecide,
    decision_fatigue: adaptive.decisionFatigue,
    simplify_mode: adaptive.simplifyMode,
    routing_hint: adaptive.routingHint,
    frustration_escape: ux.frustrationEscape,
    active_listening: ux.activeListening,
    context_flushed: ux.contextFlushed,
    precision_affordance: ux.precisionAffordance,
    progressive_disclosure: ux.progressiveDisclosure,
    ...craftMetadataFields(adaptive.craft),
  };
}

export type { VitalityRoutingBias };
