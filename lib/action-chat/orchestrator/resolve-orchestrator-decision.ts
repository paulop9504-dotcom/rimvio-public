import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { orchestrateEntityFacet } from "@/lib/context-resolver/discovery/orchestrate-entity-facet";
import { orchestrateEntityQuickPick } from "@/lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { parseFindPlaceIntent } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import { orchestratePlaceRecommendation } from "@/lib/context-resolver/discovery/orchestrate-place-recommendation";
import { toMealDiscoveryQuery } from "@/lib/event-kernel/execution-planner/to-meal-discovery-query";
import { orchestrateContextualMealRecommendation } from "@/lib/event-os/contextual-recommendation/orchestrate-contextual-meal";
import { orchestrateOcrScheduleCandidates } from "@/lib/events/orchestrate-ocr-schedule-candidates";
import { orchestrateViaReviewExecutionQueue } from "@/lib/event-os/resolve-review-execution-orchestrator";
import { eventKernelOSIsTerminal } from "@/lib/event-kernel";
import { resolveContractActionFromMessage } from "@/lib/event-kernel/slot-filling/resolve-contract-action-from-message";
import { orchestrateVitalityStateIntent } from "@/lib/vitality-state/orchestrate-vitality-state-intent";
import { isAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { orchestrateAiIntent } from "@/lib/action-chat/orchestrate-ai-intent";
import { isVitalityStateUtterance } from "@/lib/vitality-state/classify-vitality-state-intent";
import { routeWithLlm, shouldInvokeLlmRouter } from "@/lib/action-chat/llm-router";
import {
  expandTikiTakaChoiceReply,
  isTikiTakaChoiceReply,
} from "@/lib/action-chat/tiki-taka-choice-reply";
import {
  orchestrateDecisionPriorityOverride,
  shouldForceDecisionRoute,
} from "@/lib/action-chat/routing-patches/decision-priority-override";
import {
  buildContextDriftClarifyResult,
  isContextDriftInput,
  resolveContextDrift,
} from "@/lib/action-chat/routing-patches/context-drift-resolver";
import {
  isGlobalReplanInput,
  orchestrateGlobalReplan,
} from "@/lib/action-chat/routing-patches/scheduling-global-replan";
import { tryChatAxisEarlyRoute } from "@/lib/action-chat/routing-patches/chat-axis-router";
import { orchestrateAdaptiveSimplifyRoute } from "@/lib/action-chat/adaptive-behavior/orchestrate-adaptive-behavior";
import { buildSimplifyContextClarify } from "@/lib/action-chat/adaptive-behavior/build-simplify-reply";
import { adaptiveMetadataFields } from "@/lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import {
  orchestrateFrustrationEscape,
  orchestrateActiveListeningRoute,
  orchestrateImpossibleConstraintRoute,
  orchestrateProactiveAssumptionRoute,
} from "@/lib/action-chat/adaptive-behavior/ux-guards/orchestrate-ux-guards";
import { inferFallbackRecovery } from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";
import type { FallbackRecoveryCandidate } from "@/lib/action-chat/fallback-recovery/types";
import { orchestrateFallbackRecovery } from "@/lib/action-chat/fallback-recovery/apply-fallback-recovery";
import {
  orchestrateContextualPivotRoute,
  orchestrateCrossDomainCraftRoute,
} from "@/lib/action-chat/conversation-craft/orchestrate-conversation-craft";
import { orchestrateEventCommitGate } from "@/lib/event-commit-gate/orchestrate-event-commit-gate";
import { orchestrateSlotCollectContinuation } from "@/lib/event-commit-gate/resolve-slot-collect-reply";
import {
  isTravelTripAnnouncement,
  tryTravelTripAnnouncement,
} from "@/lib/action-chat/try-travel-trip-announcement";
import { orchestrateStudyContext } from "@/lib/contextual-aux/study/orchestrate-study-context";
import type {
  EarlyOrchestratorDecision,
  OrchestratorPipelineBase,
} from "@/lib/action-chat/orchestrator/orchestrator-pipeline-base";
import { runPrePipelineProbes } from "@/lib/action-chat/orchestrator/routing/run-pre-pipeline-probes";

const MEAL_OR_VITALITY = /(?:먹|맛집|배고|카페|피곤|힘들|지쳤|쉬고)/iu;

const RECOVERY_PRIMARY_SKIP_VITALITY = new Set<FallbackRecoveryCandidate>([
  "career_planning",
  "education_planning",
]);

function shouldSkipVitalityForRecovery(message: string): boolean {
  return RECOVERY_PRIMARY_SKIP_VITALITY.has(inferFallbackRecovery(message).primary);
}

export async function resolveOrchestratorEarlyDecision(
  base: OrchestratorPipelineBase,
): Promise<EarlyOrchestratorDecision | null> {
  const {
    input,
    message,
    effectiveMessage,
    routingMessage,
    context,
    adaptive,
    eventState,
    locationMemory,
  } = base;
  const { os } = eventState;

  const probed = await runPrePipelineProbes(base);
  if (probed) {
    return probed;
  }

  if (base.adaptive.ux.frustrationEscape) {
    return {
      tier: 3 as const,
      label: "FrustrationEscape",
      detail: "UX_circuit_breaker",
      terminal: "EARLY_RETURN",
      partial: orchestrateFrustrationEscape(base.adaptive),
      applyPresentation: true,
    };
  }

  if (isGlobalReplanInput(base.message)) {
    const replan = orchestrateGlobalReplan({
      message: base.message,
      referenceDate: base.context.currentDate,
      existingSchedule: base.context.existingSchedule ?? [],
    });
    return {
      tier: 4 as const,
      label: "GlobalReplan",
      detail: "PATCH3_scheduling_override",
      terminal: "EARLY_RETURN",
      partial: replan,
    };
  }

  const eventReviewDateResolution = orchestrateViaReviewExecutionQueue({
    message: base.message,
  });
  if (eventReviewDateResolution) {
    return {
      tier: 4 as const,
      label: "EventReviewDateResolution",
      detail: "ocr_review_dates",
      terminal: "EARLY_RETURN",
      partial: eventReviewDateResolution,
    };
  }

  const ocrSchedule = orchestrateOcrScheduleCandidates({
    composerContext: base.input.composerContext,
    referenceDate: base.context.currentDate,
  });
  if (ocrSchedule) {
    return {
      tier: 5 as const,
      label: "OcrScheduleExtract",
      detail: "composer_attachment",
      terminal: "EARLY_RETURN",
      partial: ocrSchedule,
    };
  }

  if (!shouldSkipVitalityForRecovery(base.message) && isVitalityStateUtterance(base.message)) {
    const vitality = await orchestrateVitalityStateIntent({
      message: base.message,
      existingSchedule: base.context.existingSchedule,
      referenceDate: base.context.currentDate,
    });
    if (vitality) {
      return {
        tier: 5 as const,
        label: "VitalityState",
        detail: base.message.trim(),
        terminal: "EARLY_RETURN",
        partial: vitality,
        applyPresentation: true,
      };
    }
  }

  const commitGateEarly = orchestrateEventCommitGate({
    message: base.effectiveMessage,
    referenceDate: base.context.currentDate,
  });
  if (commitGateEarly) {
    return {
      tier: 4 as const,
      label: "EventCommitGate",
      detail: commitGateEarly.metadata?.semantic_reason ?? "clarify",
      terminal: "EARLY_RETURN",
      partial: commitGateEarly,
    };
  }

  const travelTripEarly = tryTravelTripAnnouncement({
    message: base.effectiveMessage,
    referenceDate: base.context.currentDate,
  });
  if (travelTripEarly) {
    return {
      tier: 5 as const,
      label: "TravelTripAnnouncement",
      detail: "early_route",
      terminal: "EARLY_RETURN",
      partial: travelTripEarly,
    };
  }

  if (shouldForceDecisionRoute(base.effectiveMessage, base.input.chatAxis)) {
    const decisionOverrideEarly = orchestrateDecisionPriorityOverride(
      base.effectiveMessage,
      base.input.chatAxis,
      base.adaptive,
    );
    if (decisionOverrideEarly) {
      return {
        tier: 4 as const,
        label: "DecisionPriorityOverride",
        detail: "PATCH1_decision_force",
        terminal: "EARLY_RETURN",
        partial: decisionOverrideEarly,
      };
    }
  }

  const studyContextEarly = orchestrateStudyContext(base.effectiveMessage);
  if (studyContextEarly) {
    return {
      tier: 5 as const,
      label: "ContextualStudyAux",
      detail: studyContextEarly.metadata?.study_situation ?? "study",
      terminal: "EARLY_RETURN",
      partial: studyContextEarly,
    };
  }

  const slotCollectResume = await orchestrateSlotCollectContinuation({
    message: base.effectiveMessage,
    history: base.input.history,
  });
  if (slotCollectResume) {
    return {
      tier: 4 as const,
      label: "SlotCollectResume",
      detail: slotCollectResume.metadata?.semantic_reason ?? "slot_filled",
      terminal: "EARLY_RETURN",
      partial: slotCollectResume,
    };
  }

  const recoveryPrimaryEarly = inferFallbackRecovery(base.effectiveMessage).primary;
  if (
    recoveryPrimaryEarly === "career_planning" ||
    recoveryPrimaryEarly === "education_planning"
  ) {
    const recovery = orchestrateFallbackRecovery(base.effectiveMessage, base.adaptive);
    return {
      tier: 2 as const,
      label: "FallbackRecovery",
      detail: recoveryPrimaryEarly,
      terminal: "EARLY_RETURN",
      partial: recovery,
      applyPresentation: true,
    };
  }

  const activeListeningRoute = orchestrateActiveListeningRoute(base.message, base.adaptive);
  if (activeListeningRoute) {
    return {
      tier: 3 as const,
      label: "ActiveListening",
      detail: "UX_counseling_bypass",
      terminal: "EARLY_RETURN",
      partial: activeListeningRoute,
      applyPresentation: true,
    };
  }

  const impossibleConstraint = orchestrateImpossibleConstraintRoute(
    base.effectiveMessage,
    base.adaptive
  );
  if (impossibleConstraint) {
    return {
      tier: 4 as const,
      label: "ImpossibleConstraint",
      detail: "UX_constraint_handler",
      terminal: "EARLY_RETURN",
      partial: impossibleConstraint,
      applyPresentation: true,
    };
  }

  if (base.input.chatAxis) {
    const axisRoute = await tryChatAxisEarlyRoute({
      chatAxis: base.input.chatAxis,
      message: base.message,
      history: base.input.history,
      referenceDate: base.context.currentDate,
      existingSchedule: base.context.existingSchedule ?? [],
    });
    if (axisRoute) {
    return {
      tier: 4 as const,
      label: "ChatAxisRoute",
      detail: base.input.chatAxis,
      terminal: "EARLY_RETURN",
      partial: axisRoute,
    };
    }
  }

  const proactiveAssumption = orchestrateProactiveAssumptionRoute(
    base.effectiveMessage,
    base.adaptive,
    base.context.currentDate
  );
  if (proactiveAssumption) {
    return {
      tier: 4 as const,
      label: "ProactiveAssumption",
      detail: "UX_context_assumption",
      terminal: "EARLY_RETURN",
      partial: proactiveAssumption,
      applyPresentation: true,
    };
  }

  const contextualPivot = orchestrateContextualPivotRoute(base.adaptive);
  if (contextualPivot) {
    return {
      tier: 4 as const,
      label: "ContextualPivot",
      detail: "CRAFT_routine_break",
      terminal: "EARLY_RETURN",
      partial: contextualPivot,
      applyPresentation: true,
    };
  }

  const crossDomainCraft = orchestrateCrossDomainCraftRoute(base.adaptive);
  if (crossDomainCraft && MEAL_OR_VITALITY.test(base.effectiveMessage)) {
    return {
      tier: 4 as const,
      label: "CrossDomainCraft",
      detail: "CRAFT_schedule_meal_stitch",
      terminal: "EARLY_RETURN",
      partial: crossDomainCraft,
      applyPresentation: true,
    };
  }

  const adaptiveSimplify = await orchestrateAdaptiveSimplifyRoute({
    message: base.message,
    history: base.input.history,
    chatAxis: base.input.chatAxis,
    adaptive: base.adaptive,
  });
  if (adaptiveSimplify) {
    return {
      tier: 4 as const,
      label: "AdaptiveSimplify",
      detail: base.adaptive.autoDecide ? "auto_decide" : "decision_fatigue",
      terminal: "EARLY_RETURN",
      partial: adaptiveSimplify,
      applyPresentation: true,
    };
  }

  if (!base.adaptive.ux.contextFlushed && isContextDriftInput(base.effectiveMessage)) {
    const drift = resolveContextDrift(base.effectiveMessage, base.input.history);
    if (drift.kind === "clarify") {
      const clarifySummary = base.adaptive.simplifyMode
        ? buildSimplifyContextClarify({ confidence: drift.confidence ?? 0.2 })
        : drift.summary;
      return {
        tier: 4 as const,
        label: "ContextDriftClarify",
        detail: "PATCH2_state_request",
        terminal: "EARLY_RETURN",
        partial: {
          ...buildContextDriftClarifyResult({ kind: "clarify", summary: clarifySummary }),
          metadata: mergeOrchestratorMetadata(undefined, {
            ...adaptiveMetadataFields(base.adaptive, {
              intent: "CONVERSATION",
              trust_level_adjustment: "NONE",
              ai_intent: "DECISION",
              semantic_reason: base.adaptive.simplifyMode
                ? "context_drift_simplify"
                : "context_drift_clarify",
              routing_patch: "PATCH2_CONTEXT_DRIFT",
            }),
          }),
        },
      };
    }
    if (drift.kind === "expand" && drift.priorIntent === "food") {
      const discovery = await orchestratePlaceRecommendation(drift.query, {
        history: base.input.history,
      });
      if (discovery) {
        return {
          tier: 4 as const,
          label: "ContextDriftExpand",
          detail: drift.priorIntent,
          terminal: "EARLY_RETURN",
          partial: {
            ...discovery,
            summary: `아까 주제 기준으로 비슷하게 골라봤어요.\n\n${discovery.summary ?? ""}`.trim(),
            metadata: mergeOrchestratorMetadata(discovery.metadata, {
              routing_patch: "PATCH2_CONTEXT_DRIFT",
              prior_intent: drift.priorIntent,
            }),
          },
          applyPresentation: true,
        };
      }
    }
    if (drift.kind === "expand" && drift.priorIntent !== "food") {
      const aiFollowUp = orchestrateAiIntent(drift.query, { adaptive: base.adaptive });
      if (aiFollowUp) {
        return {
          tier: 4 as const,
          label: "ContextDriftDecision",
          detail: drift.priorIntent,
          terminal: "EARLY_RETURN",
          partial: {
            ...aiFollowUp,
            metadata: mergeOrchestratorMetadata(aiFollowUp.metadata, {
              routing_patch: "PATCH2_CONTEXT_DRIFT",
              prior_intent: drift.priorIntent,
            }),
          },
        };
      }
    }
  }

  const entityQuickPick = orchestrateEntityQuickPick(base.message);
  if (entityQuickPick) {
    return {
      tier: 5 as const,
      label: "EntityQuickPick",
      detail: base.message.trim(),
      terminal: "EARLY_RETURN",
      partial: entityQuickPick,
    };
  }

  if (base.input.history?.length && isTikiTakaChoiceReply(base.message)) {
    const expanded = expandTikiTakaChoiceReply(base.message, base.input.history);
    if (expanded?.kind === "conversation") {
    return {
      tier: 5 as const,
      label: "TikiTakaChoice",
      detail: expanded.summary.slice(0, 40),
      terminal: "EARLY_RETURN",
      partial: {
        summary: expanded.summary,
        actions: [],
        source: "conversation",
        confidence: 0.86,
        disclosure: "none",
        actionsRevealed: false,
        pendingConfirm: false,
        presentation: { mode: "conversation" },
        metadata: {
        intent: "CONVERSATION",
        trust_level_adjustment: "NONE",
        ai_intent: "DECISION",
        semantic_reason: "tiki_taka_choice",
        },
      },
    };
    }
    if (expanded?.kind === "meal") {
      const discovery = await orchestratePlaceRecommendation(expanded.query, {
        history: base.input.history,
      });
      if (discovery) {
    return {
      tier: 5 as const,
      label: "TikiTakaMealChoice",
      detail: expanded.label,
      terminal: "EARLY_RETURN",
      partial: {
        ...discovery,
        summary: `${expanded.label} 기준으로 골라봤어요.\n\n${discovery.summary ?? ""}`.trim(),
      },
    };
      }
    }
  }

  if (shouldInvokeLlmRouter(base.message, base.routingMessage)) {
    const routerOutcome = await routeWithLlm({
      message: base.message,
      routingMessage: base.routingMessage,
      history: base.input.history,
    });

    if (routerOutcome?.kind === "result") {
    return {
      tier: 5 as const,
      label: "LlmRouter",
      detail: base.message.trim(),
      terminal: "EARLY_RETURN",
      partial: routerOutcome.result,
    };
    }

    if (routerOutcome?.kind === "defer_meal") {
      base.flags.skipAiIntentStub = true;
    }
  }

  if (!base.flags.skipAiIntentStub && !isVitalityStateUtterance(base.message)) {
    const aiIntentEarly = orchestrateAiIntent(base.routingMessage, { adaptive: base.adaptive });
    if (aiIntentEarly) {
    return {
      tier: 5 as const,
      label: "AiIntent",
      detail: base.message.trim(),
      terminal: "EARLY_RETURN",
      partial: aiIntentEarly,
      applyPresentation: true,
    };
    }
  }

  const contractAction = resolveContractActionFromMessage(base.routingMessage).action;
  if (
    contractAction === "MEAL_RECOMMENDATION" ||
    base.eventState.os.executionPlan.action === "MEAL_RECOMMENDATION"
  ) {
    const contextualMeal = orchestrateContextualMealRecommendation({
      message: base.message,
      history: base.input.history,
    });

    const mealMessage = toMealDiscoveryQuery(base.message);
    const discoveryMessage = enrichPlaceDiscoveryMessage(mealMessage, base.input.history);
    const discovery = await orchestratePlaceRecommendation(discoveryMessage, {
      history: base.input.history,
    });
    if (contextualMeal) {
      const merged: OrchestratorResult = discovery?.cafeDiscovery?.options?.length
        ? {
            ...contextualMeal.orchestrator,
            ...discovery,
            summary: `${contextualMeal.orchestrator.summary}\n\n${discovery.summary ?? ""}`.trim(),
            metadata: mergeOrchestratorMetadata(
              contextualMeal.orchestrator.metadata,
              discovery.metadata ?? {},
            ),
          }
        : contextualMeal.orchestrator;
      return {
        tier: 5 as const,
        label: "ContextualMealRecommendation",
        detail: "constraint_engine",
        terminal: "EARLY_RETURN",
        partial: merged,
      };
    }
    if (discovery?.cafeDiscovery?.options?.length) {
    return {
      tier: 5 as const,
      label: "MealRecommendation",
      detail: "contract_bound",
      terminal: "EARLY_RETURN",
      partial: discovery,
    };
    }
    if (contractAction === "MEAL_RECOMMENDATION") {
      const query = toMealDiscoveryQuery(base.message);
      return {
        tier: 5 as const,
        label: "MealRecommendation",
        detail: "contract_fallback",
        terminal: "EARLY_RETURN",
        partial: {
          summary: `${query.includes("맛집") ? query : `${query} 맛집`}을 찾아볼게요.`,
        actions: [
        {
        id: "meal-search",
        label: "맛집 검색",
        kind: "custom",
        payload: { query },
        },
        ],
        source: "rules",
        confidence: 0.85,
        disclosure: "high",
        actionsRevealed: true,
        pendingConfirm: false,
        metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      },
    };
    }
  }

  const entityFacet = await orchestrateEntityFacet(base.message);
  if (entityFacet) {
    return {
      tier: 5 as const,
      label: "EntityFacet",
      detail: base.message.trim(),
      terminal: "EARLY_RETURN",
      partial: entityFacet,
    };
  }

  const discoveryMessage = enrichPlaceDiscoveryMessage(base.message, base.input.history);
  if (parseFindPlaceIntent(discoveryMessage)) {
    const discovery = await orchestratePlaceRecommendation(discoveryMessage, {
      history: base.input.history,
    });
    if (discovery?.cafeDiscovery?.options?.length) {
    return {
      tier: 5 as const,
      label: "PlaceRecommendation",
      detail: "discovery_fast_path",
      terminal: "EARLY_RETURN",
      partial: discovery,
    };
    }
  }

  if (base.eventState.os.orchestratorResult && eventKernelOSIsTerminal(base.eventState.os)) {
    const swallowedByHigherIntent =
      isVitalityStateUtterance(base.message) ||
      resolveContractActionFromMessage(base.routingMessage).action === "MEAL_RECOMMENDATION" ||
      isAiIntentUtterance(base.routingMessage) ||
      isTravelTripAnnouncement(base.effectiveMessage);
    if (!swallowedByHigherIntent) {
    return {
      tier: 0 as const,
      label: "EventKernelOS",
      detail: base.eventState.os.output.hint,
      terminal: "KERNEL_OS",
      partial: base.eventState.os.orchestratorResult,
    };
    }
  }

  return null;
}
