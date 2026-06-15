import {
  createInitialFeedbackState,
  type CognitiveOrchestratorInput,
  type CognitiveOrchestratorResult,
  type FeedbackState,
} from "@/lib/cognitive-orchestrator/types";
import { executeCognitivePipeline } from "@/lib/cognitive-orchestrator/execute-pipeline";
import { processEventFeedback } from "@/lib/event-feedback-loop/process-feedback";

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

/** CognitiveOrchestrator v1 — coordinates the full cognitive pipeline. */
export function runCognitiveCycle(input: CognitiveOrchestratorInput): CognitiveOrchestratorResult {
  const { eventStream, systemState } = input;
  const { draft, executionLog } = executeCognitivePipeline({
    eventStream,
    now: input.now,
  });

  executionLog.push("step:6:feedback:update");
  const pendingInteractions = input.userInteractions ?? [];
  const feedbackInput = systemState.feedbackState ?? createInitialFeedbackState();
  const feedbackLoop = processEventFeedback({
    events: pendingInteractions,
    state: toFeedbackInputState(feedbackInput),
  });
  const feedbackState = toFeedbackOutputState(feedbackInput, feedbackLoop);

  return {
    context: draft.context,
    opportunities: draft.opportunities,
    decisions: draft.decisions,
    uiState: draft.uiState,
    feedbackState,
    executionLog,
  };
}
