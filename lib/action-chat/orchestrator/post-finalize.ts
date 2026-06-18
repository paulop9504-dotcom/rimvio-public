import { enforceConfirmationTrigger } from "@/lib/action-chat/confirm-enforcement";
import { reconcileRecommendationOrchestratorResult } from "@/lib/action-chat/reconcile-recommendation-result";
import { derivePresentationWire } from "@/lib/presentation/presentation-mode";
import { persistOrchestratorToContainer } from "@/lib/container-store/orchestrate-container-route";
import { isGuardrailNegotiation } from "@/lib/safety/types";
import { isPolicyIntercept } from "@/lib/policy/orchestrate-content-policy";
import {
  applyIntentRouteToResult,
  type IntentRoute,
} from "@/lib/action-chat/intent-router";
import type { MasterOrchestratorContext } from "@/lib/action-chat/master-orchestrator-context";
import type {
  OrchestrateHistoryTurn,
  OrchestratorResult,
} from "@/lib/action-chat/orchestrator-types";
import type { GlobalBrainMiddlewareResult } from "@/lib/global-brain/run-global-brain-middleware";
import type { EventCandidateWire } from "@/lib/events/event-candidate";
import type { OrchestratorTrace } from "@/lib/action-chat/orchestrator/orchestrator-trace";
import { runArchitectDispatcher } from "@/lib/action-chat/orchestrator/run-architect-dispatcher";
import { stampGoalEngineMetadata } from "@/lib/goal-engine/stamp-goal-metadata";
import type { GoalSnapshot } from "@/lib/goal-engine/types";

export type PostFinalizeInput = {
  message: string;
  history?: readonly OrchestrateHistoryTurn[];
  route: IntentRoute;
  context: MasterOrchestratorContext;
  container?: { id: string; title?: string } | null;
  autoSavedWire?: OrchestratorResult["knowledgeSaved"];
  brain: GlobalBrainMiddlewareResult | null;
  eventCandidate: EventCandidateWire | null;
  trace: OrchestratorTrace;
  goalSnapshot?: GoalSnapshot | null;
};

function attachGlobalBrain(
  result: OrchestratorResult,
  brain: GlobalBrainMiddlewareResult | null
): OrchestratorResult {
  if (!brain) {
    return result;
  }

  const patch: import("@/lib/global-brain/types").GlobalBrainWire = {};
  if (brain.statusPatch) {
    patch.userStatusPatch = brain.statusPatch;
  }
  if (brain.preferencePatch) {
    patch.preferencePatch = brain.preferencePatch;
  }
  if (brain.nexusContactTouch) {
    patch.nexusContactTouch = brain.nexusContactTouch;
  }
  if (brain.actionEventUpsert) {
    patch.actionEventUpsert = brain.actionEventUpsert;
  }

  if (
    !patch.userStatusPatch &&
    !patch.preferencePatch &&
    !patch.nexusContactTouch &&
    !patch.actionEventUpsert
  ) {
    return result;
  }

  return { ...result, globalBrain: patch };
}

function attachEventCandidate(
  result: OrchestratorResult,
  eventCandidate: EventCandidateWire | null
): OrchestratorResult {
  if (!eventCandidate) {
    return result;
  }
  return { ...result, eventCandidateUpsert: eventCandidate };
}

function finalizeWire(
  result: OrchestratorResult,
  input: PostFinalizeInput
): OrchestratorResult {
  const wired = stampGoalEngineMetadata(result, input.goalSnapshot ?? null);
  return applyIntentRouteToResult(
    withTrace(
      attachEventCandidate(attachGlobalBrain(wired, input.brain), input.eventCandidate),
      input.trace
    ),
    input.route
  );
}

/** Cross-cutting post-hook — confirmation, presentation, container persist, trace. */
export async function postFinalizeOrchestratorResult(
  result: OrchestratorResult,
  input: PostFinalizeInput
): Promise<OrchestratorResult> {
  if (isGuardrailNegotiation(result.guardrail?.decision)) {
    return finalizeWire(result, input);
  }

  if (isPolicyIntercept(result.policy)) {
    return finalizeWire(result, input);
  }

  if (result.experienceChoice || result.timeChoice || result.scheduleAdvisory) {
    return finalizeWire(result, input);
  }

  const dispatched = runArchitectDispatcher({
    result,
    message: input.message,
    trace: input.trace,
    existingSchedule: input.context.existingSchedule,
  });

  const enforced = enforceConfirmationTrigger({
    message: input.message,
    history: input.history,
    result: dispatched,
    referenceDate: input.context.currentDate,
    existingSchedule: input.context.existingSchedule,
  });

  const reconciled = await reconcileRecommendationOrchestratorResult({
    message: input.message,
    history: input.history,
    result: enforced,
  });

  const next = !input.autoSavedWire?.length
    ? reconciled
    : {
        ...reconciled,
        knowledgeSaved: [...(reconciled.knowledgeSaved ?? []), ...input.autoSavedWire],
        summary:
          reconciled.knowledgeSaved?.length || reconciled.uiTrigger
            ? reconciled.summary
            : `저장했어요 · ${input.autoSavedWire[0]?.label ?? "데이터"}`,
      };

  const withContainerMeta = input.container?.id
    ? {
        ...next,
        metadata: {
          ...(next.metadata ?? { intent: "ACTION", trust_level_adjustment: "NONE" }),
          container_id: input.container.id,
        },
      }
    : next;

  const withPresentation = {
    ...withContainerMeta,
    presentation: derivePresentationWire(withContainerMeta),
  };

  void persistOrchestratorToContainer({
    container: input.container ?? null,
    message: input.message,
    result: withPresentation,
  });

  return finalizeWire(withPresentation, input);
}

function withTrace(result: OrchestratorResult, trace: OrchestratorTrace): OrchestratorResult {
  const lines = trace.snapshot();
  if (lines.length === 0) {
    return result;
  }
  return { ...result, orchestratorTrace: lines };
}
