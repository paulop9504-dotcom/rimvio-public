import {
  masterContextFromApiPayload,
} from "@/lib/action-chat/client-master-context";
import {
  applyContextIsolation,
  eventStateToIntentRoute,
} from "@/lib/action-chat/intent-router";
import { buildConversationEventState } from "@/lib/action-chat/conversation-event-state";
import { routeOrchestratorContainer } from "@/lib/container-store/orchestrate-container-route";
import type { OrchestratorPipelineInput } from "@/lib/action-chat/orchestrator/pipeline-context";
import {
  attachFinalize,
  createPipelineShell,
} from "@/lib/action-chat/orchestrator/pipeline-context";
import type { OrchestratorPipelineContext } from "@/lib/action-chat/orchestrator/pipeline-context";
import {
  emitOrchestratorTrace,
  OrchestratorTrace,
} from "@/lib/action-chat/orchestrator/orchestrator-trace";
import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import { resolveAdaptiveBehaviorContext } from "@/lib/action-chat/adaptive-behavior/resolve-adaptive-behavior";
import { applyCraftPresentation } from "@/lib/action-chat/conversation-craft/apply-craft-presentation";
import { applyAdaptivePersona } from "@/lib/action-chat/adaptive-persona/apply-adaptive-persona";
import { applyFallbackRecovery } from "@/lib/action-chat/fallback-recovery/apply-fallback-recovery";
import {
  applyUxGuardPresentation,
} from "@/lib/action-chat/adaptive-behavior/ux-guards/orchestrate-ux-guards";
import {
  buildGoalSnapshot,
  deriveGoalPriorityHint,
} from "@/lib/goal-engine";
import {
  createFallbackGoalPriorityHint,
  createFallbackGoalSnapshot,
} from "@/lib/goal-engine/fallback-goal-snapshot";
import { mapMasterContextToSnapshotInput } from "@/lib/goal-engine/map-master-context-to-snapshot-input";
import type { GoalPriorityHint, GoalSnapshot } from "@/lib/goal-engine/types";
import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import type { IntentRoute } from "@/lib/action-chat/intent-router";
import type { EventKernelState } from "@/lib/event-kernel/types";
import type { ConversationEventState } from "@/lib/action-chat/conversation-event-state";
import {
  mergeOrchestratorMetadata,
  type OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { ChatAxis } from "@/lib/action-chat/chat-three-axis";
import type { EventKernelMemoryOutput } from "@/lib/event-kernel/memory/types";
import type { EventKernelSearchPlan } from "@/lib/event-kernel/search-planner/types";
import type { LocationMemoryWire } from "@/lib/location-memory/types";
import type { UserDefinedAction } from "@/lib/actions/user-defined-action-types";
import {
  autoSaveKnowledgeFromMessage,
  mapKnowledgeEntitiesToWire,
} from "@/lib/action-chat/action-oriented-handler";

export type OrchestratorPipelineBase = {
  input: OrchestratorPipelineInput;
  pipelineInput: OrchestratorPipelineInput;
  message: string;
  effectiveMessage: string;
  routingMessage: string;
  context: MasterOrchestratorContext;
  adaptive: ReturnType<typeof resolveAdaptiveBehaviorContext>;
  route: IntentRoute;
  kernel: EventKernelState;
  eventState: ConversationEventState;
  memoryOutput: EventKernelMemoryOutput;
  searchPlan: EventKernelSearchPlan | null;
  locationMemory: LocationMemoryWire | null;
  userDefinedActions: UserDefinedAction[];
  goalSnapshot: GoalSnapshot;
  goalPriorityHint: GoalPriorityHint;
  /** Mutable flags shared across decision probes (e.g. LLM router defer). */
  flags: { skipAiIntentStub: boolean };
};

export function withPresentationLayers(
  result: OrchestratorResult,
  adaptive: OrchestratorPipelineBase["adaptive"],
  userMessage: string,
): OrchestratorResult {
  return applyFallbackRecovery(
    applyAdaptivePersona(
      applyCraftPresentation(applyUxGuardPresentation(result, adaptive), adaptive),
      adaptive,
    ),
    userMessage,
  );
}

export function withKernelOSMeta(
  result: OrchestratorResult,
  memoryOutput: EventKernelMemoryOutput,
  searchPlan: EventKernelSearchPlan | null,
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

/** Preserve axis tab context on every pipeline exit when the client sent `chatAxis`. */
export function stampPipelineChatAxis(
  result: OrchestratorResult,
  chatAxis?: ChatAxis,
): OrchestratorResult {
  if (!chatAxis) {
    return result;
  }
  return {
    ...result,
    metadata: mergeOrchestratorMetadata(result.metadata, { chat_axis: chatAxis }),
  };
}

export async function buildOrchestratorPipelineBase(
  input: OrchestratorPipelineInput,
): Promise<OrchestratorPipelineBase> {
  const message = input.message.trim();
  const context = masterContextFromApiPayload(input.masterContext);

  let goalSnapshot: GoalSnapshot;
  let goalPriorityHint: GoalPriorityHint;
  try {
    goalSnapshot = buildGoalSnapshot(
      mapMasterContextToSnapshotInput({ context, masterContext: input.masterContext }),
    );
    if (process.env.NODE_ENV === "development") {
      Object.freeze(goalSnapshot);
      Object.freeze(goalSnapshot.activeGoals);
    }
    goalPriorityHint = deriveGoalPriorityHint(goalSnapshot, { userMessage: message });
  } catch {
    goalSnapshot = createFallbackGoalSnapshot(context.currentDate);
    goalPriorityHint = createFallbackGoalPriorityHint();
  }

  const pipelineInput: OrchestratorPipelineInput = {
    ...input,
    goalSnapshot,
    goalPriorityHint,
  };

  const adaptive = resolveAdaptiveBehaviorContext({
    message,
    history: input.history,
    chatAxis: input.chatAxis,
    vitalityMemory: input.vitalityMemory,
    referenceDate: context.currentDate,
    existingSchedule: context.existingSchedule,
  });

  const eventState = buildConversationEventState({
    message,
    history: input.history,
    linkTitle: input.linkTitle,
  });

  return {
    input,
    pipelineInput,
    message,
    effectiveMessage: adaptive.effectiveMessage,
    routingMessage: enrichPlaceDiscoveryMessage(adaptive.effectiveMessage, input.history),
    context,
    adaptive,
    route: eventStateToIntentRoute(eventState),
    kernel: eventState.kernel,
    eventState,
    memoryOutput: eventState.memoryOutput,
    searchPlan: eventState.searchPlan,
    locationMemory: input.masterContext?.locationMemory ?? null,
    userDefinedActions:
      input.userDefinedActions ?? input.masterContext?.userDefinedActions ?? [],
    goalSnapshot,
    goalPriorityHint,
    flags: { skipAiIntentStub: false },
  };
}

export type EarlyOrchestratorDecision = {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  label: string;
  detail?: string;
  terminal: "EARLY_RETURN" | "KERNEL_OS";
  partial: OrchestratorResult;
  applyPresentation?: boolean;
};

export async function completeEarlyOrchestratorDecision(
  base: OrchestratorPipelineBase,
  decision: EarlyOrchestratorDecision,
): Promise<OrchestratorResult> {
  const trace = new OrchestratorTrace();
  trace.hit(0, decision.tier, decision.label, decision.detail);
  trace.terminal(decision.terminal);

  const scoped = applyContextIsolation(base.pipelineInput, base.route);
  const containerRoute = await routeOrchestratorContainer({
    message: base.message,
    linkTitle: scoped.linkTitle,
    linkUrl: scoped.linkUrl,
  });

  const shell = createPipelineShell({
    input: base.pipelineInput,
    message: base.message,
    route: base.route,
    kernel: base.kernel,
    scoped,
    context: base.context,
    locationMemory: base.locationMemory,
    userDefinedActions: base.userDefinedActions,
    trace,
    containerRoute,
    autoSavedWire: undefined,
  });

  let partial = decision.partial;
  if (decision.applyPresentation) {
    partial = withPresentationLayers(partial, base.adaptive, base.message);
  }

  const result = await shell.finalize({
    ...partial,
    orchestratorTrace: trace.snapshot(),
  });
  emitOrchestratorTrace(result.orchestratorTrace ?? trace.snapshot());
  return stampPipelineChatAxis(
    withKernelOSMeta(result, base.memoryOutput, base.searchPlan),
    base.input.chatAxis,
  );
}

export async function prepareStandardPipelineContext(
  base: OrchestratorPipelineBase,
): Promise<OrchestratorPipelineContext> {
  const scoped = applyContextIsolation(base.pipelineInput, base.route);
  const trace = new OrchestratorTrace();
  trace.pass(0, 0, "EventKernel");

  const autoSaved = await autoSaveKnowledgeFromMessage(base.message);
  const autoSavedWire =
    autoSaved.length > 0 ? mapKnowledgeEntitiesToWire(autoSaved) : undefined;

  const containerRoute = await routeOrchestratorContainer({
    message: base.message,
    linkTitle: scoped.linkTitle,
    linkUrl: scoped.linkUrl,
  });

  return createPipelineShell({
    input: base.pipelineInput,
    message: base.message,
    route: base.route,
    kernel: base.kernel,
    scoped,
    context: base.context,
    locationMemory: base.locationMemory,
    userDefinedActions: base.userDefinedActions,
    trace,
    containerRoute,
    autoSavedWire,
  });
}

export async function completeStandardPipelineResult(
  base: OrchestratorPipelineBase,
  ctx: OrchestratorPipelineContext,
  partial: OrchestratorResult,
  applyPresentation = true,
): Promise<OrchestratorResult> {
  const finalized = await ctx.finalize(partial);
  const result = applyPresentation
    ? withPresentationLayers(finalized, base.adaptive, base.message)
    : finalized;
  emitOrchestratorTrace(result.orchestratorTrace ?? ctx.trace.snapshot());
  return stampPipelineChatAxis(
    withKernelOSMeta(result, base.memoryOutput, base.searchPlan),
    base.input.chatAxis,
  );
}
