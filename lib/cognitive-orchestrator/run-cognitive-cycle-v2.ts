import { executeCognitivePipeline, type PipelineDraft } from "@/lib/cognitive-orchestrator/execute-pipeline";
import {
  createInitialFeedbackState,
  type CognitiveOrchestratorInput,
  type CognitiveOrchestratorV2Result,
  type FeedbackState,
} from "@/lib/cognitive-orchestrator/types";
import { stabilizeCognitiveOutput } from "@/lib/cognitive-stability-guard/stabilize-cognitive-output";
import { processEventFeedback } from "@/lib/event-feedback-loop/process-feedback";
import type { SurfaceUiState } from "@/lib/surface-render-contract/types";

function toFeedbackInputState(feedbackState: FeedbackState) {
  return {
    suppressionMap: feedbackState.suppressionMap,
    surfaceBias: feedbackState.surfaceBias,
    opportunityHistory: feedbackState.opportunityHistory,
    attentionState: feedbackState.attentionState,
  };
}

function toFeedbackOutputState(
  previous: FeedbackState,
  loopResult: ReturnType<typeof processEventFeedback>
): FeedbackState {
  return {
    suppressionMap: loopResult.updatedSuppressionMap,
    surfaceBias: loopResult.updatedSurfaceBias,
    opportunityHistory: previous.opportunityHistory,
    attentionState: loopResult.attentionState,
    driftSignals: loopResult.driftSignals,
  };
}

function emptyUiState(): SurfaceUiState {
  return {
    CALENDAR: [],
    DOCK: [],
    TIMELINE: [],
    NARRATION: [],
  };
}

export type CommitGateInput = {
  draft: PipelineDraft;
  feedbackState: FeedbackState;
  executionLog: string[];
};

/** Guard commit boundary — sanitized outputs + atomic uiCommit flag. */
export function applyCommitGate(input: CommitGateInput): CognitiveOrchestratorV2Result {
  const { draft, feedbackState, executionLog } = input;

  executionLog.push("commit:guard:stabilize");
  const stable = stabilizeCognitiveOutput({
    context: draft.context,
    opportunities: draft.opportunities,
    visibilityDecisions: draft.decisions,
    uiState: draft.uiState,
    feedbackState,
    executionLog: [...executionLog],
  });

  const uiCommit = stable.isValid;
  executionLog.push(uiCommit ? "commit:ui:approved" : "commit:ui:blocked");

  return {
    context: stable.sanitizedContext,
    opportunities: stable.sanitizedOpportunities,
    decisions: stable.sanitizedDecisions,
    uiState: uiCommit ? stable.sanitizedUIState : emptyUiState(),
    feedbackState,
    isValid: stable.isValid,
    uiCommit,
    warnings: stable.warnings,
    criticalIssues: stable.criticalIssues,
    systemHealthScore: stable.systemHealthScore,
    executionLog,
    surfaceRoute: draft.surfaceRoute,
  };
}

function resolveFeedbackState(
  systemFeedback: FeedbackState | undefined,
  userInteractions: CognitiveOrchestratorInput["userInteractions"]
): FeedbackState {
  const feedbackInput = systemFeedback ?? createInitialFeedbackState();
  const feedbackLoop = processEventFeedback({
    events: userInteractions ?? [],
    state: toFeedbackInputState(feedbackInput),
  });
  return toFeedbackOutputState(feedbackInput, feedbackLoop);
}

/**
 * CognitiveOrchestrator v2 — atomic commit boundary.
 * Guard runs before any UI commit; uiCommit=false blocks render application.
 */
export function runCognitiveCycleV2(input: CognitiveOrchestratorInput): CognitiveOrchestratorV2Result {
  const { draft, executionLog } = executeCognitivePipeline({
    eventStream: input.eventStream,
    now: input.now,
  });

  executionLog.push("step:6:feedback:update");
  const feedbackState = resolveFeedbackState(
    input.systemState.feedbackState,
    input.userInteractions
  );

  return applyCommitGate({
    draft,
    feedbackState,
    executionLog,
  });
}
