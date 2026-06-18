import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import {
  detectFrustrationEscape,
  FRUSTRATION_ESCAPE_SUMMARY,
} from "@/lib/action-chat/adaptive-behavior/ux-guards/frustration-circuit-breaker";
import { detectImpossibleConstraints } from "@/lib/action-chat/adaptive-behavior/ux-guards/impossible-constraint-handler";
import { buildProactiveContextAssumption } from "@/lib/action-chat/adaptive-behavior/ux-guards/proactive-context-assumption";
import { applyProgressiveDisclosure } from "@/lib/action-chat/adaptive-behavior/ux-guards/progressive-disclosure";
import { buildActiveListeningReply } from "@/lib/action-chat/adaptive-behavior/ux-guards/active-listening-bypass";
import type { AdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/types";
import { adaptiveMetadataFields } from "@/lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";

export function orchestrateFrustrationEscape(
  adaptive: AdaptiveBehaviorContext
): OrchestratorResult {
  return {
    summary: FRUSTRATION_ESCAPE_SUMMARY,
    actions: [],
    source: "conversation",
    confidence: 0.9,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: adaptiveMetadataFields(adaptive, {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      semantic_reason: "frustration_circuit_breaker",
      routing_patch: "UX_FRUSTRATION_ESCAPE",
      frustration_escape: true,
      manual_mode: true,
      simplify_mode: true,
      suppress_chips: true,
      precision_affordance: "minimal",
    }) as OrchestratorResult["metadata"],
  };
}

export function orchestrateActiveListeningRoute(
  message: string,
  adaptive: AdaptiveBehaviorContext
): OrchestratorResult | null {
  if (!adaptive.ux.activeListening) {
    return null;
  }

  return {
    summary: buildActiveListeningReply(message),
    actions: [],
    source: "conversation",
    confidence: 0.88,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: adaptiveMetadataFields(adaptive, {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      ai_intent: "COUNSELING",
      semantic_reason: "active_listening_bypass",
      routing_patch: "UX_ACTIVE_LISTENING",
      active_listening: true,
      suppress_chips: true,
      precision_affordance: "minimal",
    }) as OrchestratorResult["metadata"],
  };
}

export function orchestrateImpossibleConstraintRoute(
  message: string,
  adaptive: AdaptiveBehaviorContext
): OrchestratorResult | null {
  const conflict = detectImpossibleConstraints(message);
  if (!conflict) {
    return null;
  }

  return {
    summary: conflict.summary,
    actions: [
      {
        id: "constraint-priority-left",
        label: conflict.leftLabel,
        kind: "custom",
        payload: { experienceChoicePrompt: `${conflict.leftLabel}으로 다시 추천해줘` },
      },
      {
        id: "constraint-priority-right",
        label: conflict.rightLabel,
        kind: "custom",
        payload: { experienceChoicePrompt: `${conflict.rightLabel}으로 다시 추천해줘` },
      },
    ],
    source: "conversation",
    confidence: 0.88,
    disclosure: "high",
    actionsRevealed: true,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: adaptiveMetadataFields(adaptive, {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      semantic_reason: "impossible_constraint",
      routing_patch: "UX_CONSTRAINT_HANDLER",
      impossible_constraint: true,
      precision_affordance: "minimal",
    }) as OrchestratorResult["metadata"],
  };
}

export function orchestrateProactiveAssumptionRoute(
  message: string,
  adaptive: AdaptiveBehaviorContext,
  referenceDate?: string
): OrchestratorResult | null {
  if (adaptive.ux.frustrationEscape || adaptive.ux.activeListening || adaptive.shouldPreemptTiki) {
    return null;
  }

  const summary = buildProactiveContextAssumption(message, referenceDate);
  if (!summary) {
    return null;
  }

  return {
    summary,
    actions: [],
    source: "conversation",
    confidence: 0.84,
    disclosure: "none",
    actionsRevealed: false,
    pendingConfirm: false,
    presentation: { mode: "conversation" },
    metadata: adaptiveMetadataFields(adaptive, {
      intent: "CONVERSATION",
      trust_level_adjustment: "NONE",
      semantic_reason: "proactive_context_assumption",
      routing_patch: "UX_PROACTIVE_ASSUMPTION",
      precision_affordance: "minimal",
    }) as OrchestratorResult["metadata"],
  };
}

export function applyUxGuardPresentation(
  result: OrchestratorResult,
  adaptive: AdaptiveBehaviorContext
): OrchestratorResult {
  let next = result;

  if (adaptive.ux.progressiveDisclosure && next.cafeDiscovery?.options?.length) {
    next = applyProgressiveDisclosure(next);
  }

  const precision = adaptive.ux.precisionAffordance;
  next = {
    ...next,
    metadata: mergeOrchestratorMetadata(next.metadata, {
      ...adaptiveMetadataFields(adaptive, {
        precision_affordance: precision,
        suppress_chips:
          adaptive.ux.frustrationEscape ||
          adaptive.ux.activeListening ||
          adaptive.simplifyMode,
      }),
    }),
  };

  if (precision === "minimal") {
    const hasPlaceResults = (next.cafeDiscovery?.options?.length ?? 0) > 0;
    next = {
      ...next,
      actionsRevealed: hasPlaceResults
        ? true
        : next.actionsRevealed && (next.actions?.length ?? 0) <= 2,
    };
  }

  return next;
}
