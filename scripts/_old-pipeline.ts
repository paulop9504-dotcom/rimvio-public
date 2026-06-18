import {
  masterContextFromApiPayload,
} from "@/lib/action-chat/client-master-context";
import {
  applyContextIsolation,
  eventStateToIntentRoute,
} from "@/lib/action-chat/intent-router";
import { buildConversationEventState } from "@/lib/action-chat/conversation-event-state";
import {
  autoSaveKnowledgeFromMessage,
  mapKnowledgeEntitiesToWire,
} from "@/lib/action-chat/action-oriented-handler";
import { routeOrchestratorContainer } from "@/lib/container-store/orchestrate-container-route";
import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import type { OrchestratorPipelineInput } from "@/lib/action-chat/orchestrator/pipeline-context";
import {
  createPipelineShell,
  refreshFinalize,
} from "@/lib/action-chat/orchestrator/pipeline-context";
import { runPhase1PrePipeline } from "@/lib/action-chat/orchestrator/phase-1-pre-pipeline";
import { runPhase2Enrichment } from "@/lib/action-chat/orchestrator/phase-2-enrichment";
import { runPhase3Resolve } from "@/lib/action-chat/orchestrator/phase-3-resolve";
import {
  emitOrchestratorTrace,
  OrchestratorTrace,
} from "@/lib/action-chat/orchestrator/orchestrator-trace";
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
import type { EventKernelMemoryOutput } from "@/lib/event-kernel/memory/types";
import type { EventKernelSearchPlan } from "@/lib/event-kernel/search-planner/types";
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
import { resolveAdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import { orchestrateAdaptiveSimplifyRoute } from "@/lib/action-chat/adaptive-behavior/orchestrate-adaptive-behavior";
import { buildSimplifyContextClarify } from "@/lib/action-chat/adaptive-behavior/build-simplify-reply";
import { adaptiveMetadataFields } from "@/lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import {
  applyUxGuardPresentation,
  orchestrateFrustrationEscape,
  orchestrateActiveListeningRoute,
  orchestrateImpossibleConstraintRoute,
  orchestrateProactiveAssumptionRoute,
} from "@/lib/action-chat/adaptive-behavior/ux-guards/orchestrate-ux-guards";
import { applyCraftPresentation } from "@/lib/action-chat/conversation-craft/apply-craft-presentation";
import { applyAdaptivePersona } from "@/lib/action-chat/adaptive-persona/apply-adaptive-persona";
import { applyFallbackRecovery } from "@/lib/action-chat/fallback-recovery/apply-fallback-recovery";
import {
  inferFallbackRecovery,
  type FallbackRecoveryCandidate,
} from "@/lib/action-chat/fallback-recovery/infer-fallback-recovery";
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

const MEAL_OR_VITALITY =
  /(?:먹|맛집|배고|카페|피곤|힘들|지쳤|쉬고)/iu;

const RECOVERY_PRIMARY_SKIP_VITALITY = new Set<FallbackRecoveryCandidate>([
  "career_planning",
  "education_planning",
]);

function shouldSkipVitalityForRecovery(message: string): boolean {
  return RECOVERY_PRIMARY_SKIP_VITALITY.has(inferFallbackRecovery(message).primary);
}

function withPresentationLayers(
  result: OrchestratorResult,
  adaptive: ReturnType<typeof resolveAdaptiveBehaviorContext>,
  userMessage: string
): OrchestratorResult {
  return applyFallbackRecovery(
    applyAdaptivePersona(
      applyCraftPresentation(applyUxGuardPresentation(result, adaptive), adaptive),
      adaptive
    ),
    userMessage
  );
}

function withKernelOSMeta(
  result: OrchestratorResult,
  memoryOutput: EventKernelMemoryOutput,
  searchPlan: EventKernelSearchPlan | null
): OrchestratorResult {
  return {
    ...result,
    meta: {
      ...result.meta,
      kernel_memory: memoryOutput,
      ...(searchPlan ? { kernel_search_plan: searchPlan } : {}),
    },
  };
}

export async function runOrchestratorPipeline(
  input: OrchestratorPipelineInput
): Promise<OrchestratorResult> {
  const message = input.message.trim();
  const context = masterContextFromApiPayload(input.masterContext);
  const adaptive = resolveAdaptiveBehaviorContext({
    message,
    history: input.history,
    chatAxis: input.chatAxis,
    vitalityMemory: input.vitalityMemory,
    referenceDate: context.currentDate,
    existingSchedule: context.existingSchedule,
  });
  const effectiveMessage = adaptive.effectiveMessage;
  const routingMessage = enrichPlaceDiscoveryMessage(effectiveMessage, input.history);
  const locationMemory = input.masterContext?.locationMemory ?? null;
  const userDefinedActions =
    input.userDefinedActions ?? input.masterContext?.userDefinedActions ?? [];

  const eventState = buildConversationEventState({
    message,
    history: input.history,
    linkTitle: input.linkTitle,
  });
  const { os, kernel, memoryOutput, searchPlan } = eventState;
  const route = eventStateToIntentRoute(eventState);

  const eventReviewDateResolution = orchestrateViaReviewExecutionQueue({
    message,
  });
  if (eventReviewDateResolution) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "EventReviewDateResolution", "ocr_review_dates");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...eventReviewDateResolution,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const eventReviewApproval = orchestrateViaReviewExecutionQueue({ message });
  if (eventReviewApproval) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "EventReviewApproval", "pending_event_review");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...eventReviewApproval,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const ocrSchedule = orchestrateOcrScheduleCandidates({
    composerContext: input.composerContext,
    referenceDate: context.currentDate,
  });
  if (ocrSchedule) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 5, "OcrScheduleExtract", "composer_attachment");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...ocrSchedule,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const commitGateEarly = orchestrateEventCommitGate({
    message: effectiveMessage,
    referenceDate: context.currentDate,
  });
  if (commitGateEarly) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "EventCommitGate", commitGateEarly.metadata?.semantic_reason ?? "clarify");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...commitGateEarly,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const travelTripEarly = tryTravelTripAnnouncement({
    message: effectiveMessage,
    referenceDate: context.currentDate,
  });
  if (travelTripEarly) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 5, "TravelTripAnnouncement", "early_route");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...travelTripEarly,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const studyContextEarly = orchestrateStudyContext(effectiveMessage);
  if (studyContextEarly) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 5, "ContextualStudyAux", studyContextEarly.metadata?.study_situation ?? "study");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...studyContextEarly,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const slotCollectResume = orchestrateSlotCollectContinuation({
    message: effectiveMessage,
    history: input.history,
  });
  if (slotCollectResume) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "SlotCollectResume", slotCollectResume.metadata?.semantic_reason ?? "slot_filled");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...slotCollectResume,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const recoveryPrimaryEarly = inferFallbackRecovery(effectiveMessage).primary;
  if (
    recoveryPrimaryEarly === "career_planning" ||
    recoveryPrimaryEarly === "education_planning"
  ) {
    const recovery = orchestrateFallbackRecovery(effectiveMessage, adaptive);
    const trace = new OrchestratorTrace();
    trace.hit(0, 2, "FallbackRecovery", recoveryPrimaryEarly);
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...withPresentationLayers(recovery, adaptive, message),
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  if (adaptive.ux.frustrationEscape) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 3, "FrustrationEscape", "UX_circuit_breaker");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...withPresentationLayers(orchestrateFrustrationEscape(adaptive), adaptive, message),
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const activeListeningRoute = orchestrateActiveListeningRoute(message, adaptive);
  if (activeListeningRoute) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 3, "ActiveListening", "UX_counseling_bypass");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...withPresentationLayers(activeListeningRoute, adaptive, message),
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const impossibleConstraint = orchestrateImpossibleConstraintRoute(
    effectiveMessage,
    adaptive
  );
  if (impossibleConstraint) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "ImpossibleConstraint", "UX_constraint_handler");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...withPresentationLayers(impossibleConstraint, adaptive, message),
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  if (isGlobalReplanInput(message)) {
    const replan = orchestrateGlobalReplan({
      message,
      referenceDate: context.currentDate,
      existingSchedule: context.existingSchedule ?? [],
    });
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "GlobalReplan", "PATCH3_scheduling_override");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...replan,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  if (input.chatAxis) {
    const axisRoute = await tryChatAxisEarlyRoute({
      chatAxis: input.chatAxis,
      message,
      history: input.history,
      referenceDate: context.currentDate,
      existingSchedule: context.existingSchedule ?? [],
    });
    if (axisRoute) {
      const trace = new OrchestratorTrace();
      trace.hit(0, 4, "ChatAxisRoute", input.chatAxis);
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const result = await shell.finalize({
        ...axisRoute,
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
  }

  const proactiveAssumption = orchestrateProactiveAssumptionRoute(
    effectiveMessage,
    adaptive,
    context.currentDate
  );
  if (proactiveAssumption) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "ProactiveAssumption", "UX_context_assumption");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...withPresentationLayers(proactiveAssumption, adaptive, message),
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const contextualPivot = orchestrateContextualPivotRoute(adaptive);
  if (contextualPivot) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "ContextualPivot", "CRAFT_routine_break");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...withPresentationLayers(contextualPivot, adaptive, message),
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const crossDomainCraft = orchestrateCrossDomainCraftRoute(adaptive);
  if (crossDomainCraft && MEAL_OR_VITALITY.test(effectiveMessage)) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "CrossDomainCraft", "CRAFT_schedule_meal_stitch");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...withPresentationLayers(crossDomainCraft, adaptive, message),
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const adaptiveSimplify = await orchestrateAdaptiveSimplifyRoute({
    message,
    history: input.history,
    chatAxis: input.chatAxis,
    adaptive,
  });
  if (adaptiveSimplify) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "AdaptiveSimplify", adaptive.autoDecide ? "auto_decide" : "decision_fatigue");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...withPresentationLayers(adaptiveSimplify, adaptive, message),
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const decisionOverride = orchestrateDecisionPriorityOverride(
    effectiveMessage,
    input.chatAxis,
    adaptive
  );
  if (decisionOverride) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 4, "DecisionPriorityOverride", "PATCH1_decision_force");
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...decisionOverride,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  if (!adaptive.ux.contextFlushed && isContextDriftInput(effectiveMessage)) {
    const drift = resolveContextDrift(effectiveMessage, input.history);
    if (drift.kind === "clarify") {
      const trace = new OrchestratorTrace();
      trace.hit(0, 4, "ContextDriftClarify", "PATCH2_state_request");
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const clarifySummary = adaptive.simplifyMode
        ? buildSimplifyContextClarify({ confidence: drift.confidence ?? 0.2 })
        : drift.summary;
      const result = await shell.finalize({
        ...buildContextDriftClarifyResult({ kind: "clarify", summary: clarifySummary }),
        metadata: adaptiveMetadataFields(adaptive, {
          intent: "CONVERSATION",
          trust_level_adjustment: "NONE",
          ai_intent: "DECISION",
          semantic_reason: adaptive.simplifyMode
            ? "context_drift_simplify"
            : "context_drift_clarify",
          routing_patch: "PATCH2_CONTEXT_DRIFT",
        }) as OrchestratorResult["metadata"],
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
    if (drift.kind === "expand" && drift.priorIntent === "food") {
      const discovery = await orchestratePlaceRecommendation(drift.query, {
        history: input.history,
      });
      if (discovery) {
        const trace = new OrchestratorTrace();
        trace.hit(0, 4, "ContextDriftExpand", drift.priorIntent);
        trace.terminal("EARLY_RETURN");
        const scoped = applyContextIsolation(input, route);
        const containerRoute = await routeOrchestratorContainer({
          message,
          linkTitle: scoped.linkTitle,
          linkUrl: scoped.linkUrl,
        });
        const shell = createPipelineShell({
          input,
          message,
          route,
          kernel,
          scoped,
          context,
          locationMemory,
          userDefinedActions,
          trace,
          containerRoute,
          autoSavedWire: undefined,
        });
        const result = await shell.finalize({
          ...withPresentationLayers(
            {
              ...discovery,
              summary: `아까 주제 기준으로 비슷하게 골라봤어요.\n\n${discovery.summary ?? ""}`.trim(),
              metadata: {
                ...discovery.metadata,
                routing_patch: "PATCH2_CONTEXT_DRIFT",
                prior_intent: drift.priorIntent,
              },
            },
            adaptive,
            message
          ),
          orchestratorTrace: trace.snapshot(),
        });
        emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
        return withKernelOSMeta(result, memoryOutput, searchPlan);
      }
    }
    if (drift.kind === "expand" && drift.priorIntent !== "food") {
      const aiFollowUp = orchestrateAiIntent(drift.query, { adaptive });
      if (aiFollowUp) {
        const trace = new OrchestratorTrace();
        trace.hit(0, 4, "ContextDriftDecision", drift.priorIntent);
        trace.terminal("EARLY_RETURN");
        const scoped = applyContextIsolation(input, route);
        const containerRoute = await routeOrchestratorContainer({
          message,
          linkTitle: scoped.linkTitle,
          linkUrl: scoped.linkUrl,
        });
        const shell = createPipelineShell({
          input,
          message,
          route,
          kernel,
          scoped,
          context,
          locationMemory,
          userDefinedActions,
          trace,
          containerRoute,
          autoSavedWire: undefined,
        });
        const result = await shell.finalize({
          ...aiFollowUp,
          metadata: {
            ...aiFollowUp.metadata,
            routing_patch: "PATCH2_CONTEXT_DRIFT",
            prior_intent: drift.priorIntent,
          },
          orchestratorTrace: trace.snapshot(),
        });
        emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
        return withKernelOSMeta(result, memoryOutput, searchPlan);
      }
    }
  }

  if (!shouldSkipVitalityForRecovery(message) && isVitalityStateUtterance(message)) {
    const vitality = await orchestrateVitalityStateIntent({
      message,
      existingSchedule: context.existingSchedule,
      referenceDate: context.currentDate,
    });
    if (vitality) {
      const trace = new OrchestratorTrace();
      trace.hit(0, 5, "VitalityState", message.trim());
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const result = await shell.finalize({
        ...withPresentationLayers(vitality, adaptive, message),
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
  }

  const entityQuickPick = orchestrateEntityQuickPick(message);
  if (entityQuickPick) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 5, "EntityQuickPick", message.trim());
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...entityQuickPick,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  if (input.history?.length && isTikiTakaChoiceReply(message)) {
    const expanded = expandTikiTakaChoiceReply(message, input.history);
    if (expanded?.kind === "conversation") {
      const trace = new OrchestratorTrace();
      trace.hit(0, 5, "TikiTakaChoice", expanded.summary.slice(0, 40));
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const result = await shell.finalize({
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
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
    if (expanded?.kind === "meal") {
      const discovery = await orchestratePlaceRecommendation(expanded.query, {
        history: input.history,
      });
      if (discovery) {
        const trace = new OrchestratorTrace();
        trace.hit(0, 5, "TikiTakaMealChoice", expanded.label);
        trace.terminal("EARLY_RETURN");
        const scoped = applyContextIsolation(input, route);
        const containerRoute = await routeOrchestratorContainer({
          message,
          linkTitle: scoped.linkTitle,
          linkUrl: scoped.linkUrl,
        });
        const shell = createPipelineShell({
          input,
          message,
          route,
          kernel,
          scoped,
          context,
          locationMemory,
          userDefinedActions,
          trace,
          containerRoute,
          autoSavedWire: undefined,
        });
        const result = await shell.finalize({
          ...discovery,
          summary: `${expanded.label} 기준으로 골라봤어요.\n\n${discovery.summary ?? ""}`.trim(),
          orchestratorTrace: trace.snapshot(),
        });
        emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
        return withKernelOSMeta(result, memoryOutput, searchPlan);
      }
    }
  }

  let skipAiIntentStub = false;

  if (shouldInvokeLlmRouter(message, routingMessage)) {
    const routerOutcome = await routeWithLlm({
      message,
      routingMessage,
      history: input.history,
    });

    if (routerOutcome?.kind === "result") {
      const trace = new OrchestratorTrace();
      trace.hit(0, 5, "LlmRouter", message.trim());
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const result = await shell.finalize({
        ...routerOutcome.result,
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }

    if (routerOutcome?.kind === "defer_meal") {
      skipAiIntentStub = true;
    }
  }

  if (!skipAiIntentStub && !isVitalityStateUtterance(message)) {
    const aiIntentEarly = orchestrateAiIntent(routingMessage, { adaptive });
    if (aiIntentEarly) {
      const trace = new OrchestratorTrace();
      trace.hit(0, 5, "AiIntent", message.trim());
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const result = await shell.finalize({
        ...withPresentationLayers(aiIntentEarly, adaptive, message),
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
  }

  const contractAction = resolveContractActionFromMessage(routingMessage).action;
  if (
    contractAction === "MEAL_RECOMMENDATION" ||
    eventState.os.executionPlan.action === "MEAL_RECOMMENDATION"
  ) {
    const contextualMeal = orchestrateContextualMealRecommendation({
      message,
      history: input.history,
    });

    const mealMessage = toMealDiscoveryQuery(message);
    const discoveryMessage = enrichPlaceDiscoveryMessage(mealMessage, input.history);
    const discovery = await orchestratePlaceRecommendation(discoveryMessage, {
      history: input.history,
    });
    if (contextualMeal) {
      const trace = new OrchestratorTrace();
      trace.hit(0, 5, "ContextualMealRecommendation", "constraint_engine");
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const merged = discovery?.cafeDiscovery?.options?.length
        ? {
            ...contextualMeal.orchestrator,
            ...discovery,
            summary: `${contextualMeal.orchestrator.summary}\n\n${discovery.summary ?? ""}`.trim(),
            metadata: {
              ...contextualMeal.orchestrator.metadata,
              ...discovery.metadata,
            },
          }
        : contextualMeal.orchestrator;
      const result = await shell.finalize({
        ...merged,
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
    if (discovery?.cafeDiscovery?.options?.length) {
      const trace = new OrchestratorTrace();
      trace.hit(0, 5, "MealRecommendation", "contract_bound");
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const result = await shell.finalize({
        ...discovery,
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
    if (contractAction === "MEAL_RECOMMENDATION") {
      const trace = new OrchestratorTrace();
      trace.hit(0, 5, "MealRecommendation", "contract_fallback");
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const query = toMealDiscoveryQuery(message);
      const result = await shell.finalize({
        summary: `${query.includes("맛집") ? query : `${query} 맛집`}을 찾아볼게요.`,
        actions: [
          {
            id: "meal-search",
            label: "맛집 검색",
            kind: "search",
            payload: { query },
          },
        ],
        source: "rules",
        confidence: 0.85,
        disclosure: "high",
        actionsRevealed: true,
        pendingConfirm: false,
        metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
  }

  const entityFacet = await orchestrateEntityFacet(message);
  if (entityFacet) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 5, "EntityFacet", message.trim());
    trace.terminal("EARLY_RETURN");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...entityFacet,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const discoveryMessage = enrichPlaceDiscoveryMessage(message, input.history);
  if (parseFindPlaceIntent(discoveryMessage)) {
    const discovery = await orchestratePlaceRecommendation(discoveryMessage, {
      history: input.history,
    });
    if (discovery?.cafeDiscovery?.options?.length) {
      const trace = new OrchestratorTrace();
      trace.hit(0, 5, "PlaceRecommendation", "discovery_fast_path");
      trace.terminal("EARLY_RETURN");
      const scoped = applyContextIsolation(input, route);
      const containerRoute = await routeOrchestratorContainer({
        message,
        linkTitle: scoped.linkTitle,
        linkUrl: scoped.linkUrl,
      });
      const shell = createPipelineShell({
        input,
        message,
        route,
        kernel,
        scoped,
        context,
        locationMemory,
        userDefinedActions,
        trace,
        containerRoute,
        autoSavedWire: undefined,
      });
      const result = await shell.finalize({
        ...discovery,
        orchestratorTrace: trace.snapshot(),
      });
      emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
      return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
  }

  if (os.orchestratorResult && eventKernelOSIsTerminal(os)) {
    const swallowedByHigherIntent =
      isVitalityStateUtterance(message) ||
      resolveContractActionFromMessage(routingMessage).action === "MEAL_RECOMMENDATION" ||
      isAiIntentUtterance(routingMessage) ||
      isTravelTripAnnouncement(effectiveMessage);
    if (!swallowedByHigherIntent) {
    const trace = new OrchestratorTrace();
    trace.hit(0, 0, "EventKernelOS", os.output.hint);
    trace.terminal("KERNEL_OS");
    const scoped = applyContextIsolation(input, route);
    const containerRoute = await routeOrchestratorContainer({
      message,
      linkTitle: scoped.linkTitle,
      linkUrl: scoped.linkUrl,
    });
    const shell = createPipelineShell({
      input,
      message,
      route,
      kernel,
      scoped,
      context,
      locationMemory,
      userDefinedActions,
      trace,
      containerRoute,
      autoSavedWire: undefined,
    });
    const result = await shell.finalize({
      ...os.orchestratorResult,
      orchestratorTrace: trace.snapshot(),
    });
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
    }
  }

  const scoped = applyContextIsolation(input, route);
  const trace = new OrchestratorTrace();
  trace.pass(0, 0, "EventKernel");

  const autoSaved = await autoSaveKnowledgeFromMessage(message);
  const autoSavedWire =
    autoSaved.length > 0 ? mapKnowledgeEntitiesToWire(autoSaved) : undefined;

  const containerRoute = await routeOrchestratorContainer({
    message,
    linkTitle: scoped.linkTitle,
    linkUrl: scoped.linkUrl,
  });

  const ctx = createPipelineShell({
    input,
    message,
    route,
    kernel,
    scoped,
    context,
    locationMemory,
    userDefinedActions,
    trace,
    containerRoute,
    autoSavedWire,
  });

  const phase1 = await runPhase1PrePipeline(ctx);
  if (phase1.earlyReturn) {
    const result = await ctx.finalize(phase1.earlyReturn);
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  const phase2 = await runPhase2Enrichment(ctx);
  refreshFinalize(ctx);
  if (phase2.fastPath) {
    const result = await ctx.finalize(phase2.fastPath);
    emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
    return withKernelOSMeta(result, memoryOutput, searchPlan);
  }

  ctx.enrichment = phase2.enrichment;
  const phase3 = await runPhase3Resolve(ctx);
  const finalized = await ctx.finalize(phase3.result);
  const result = withPresentationLayers(finalized, adaptive, message);
  emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
  return withKernelOSMeta(result, memoryOutput, searchPlan);
}
