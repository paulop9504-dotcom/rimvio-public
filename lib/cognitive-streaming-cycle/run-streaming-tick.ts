import { buildContext } from "@/lib/context-builder/build-context";
import type { CognitiveContext } from "@/lib/context-builder/types";
import { rankContextOpportunities } from "@/lib/cognitive-opportunity/rank-context-opportunities";
import { toCognitiveEvents } from "@/lib/cognitive-orchestrator/event-stream-adapter";
import type { EventStream, FeedbackState } from "@/lib/cognitive-orchestrator/types";
import { applyCommitGate } from "@/lib/cognitive-orchestrator/run-cognitive-cycle-v2";
import { createInitialFeedbackState } from "@/lib/cognitive-orchestrator/types";
import {
  computeFrameDiff,
  frameDiffIsMeaningful,
} from "@/lib/cognitive-streaming-cycle/frame-diff";
import {
  ingestEvents,
  trimEventPool,
} from "@/lib/cognitive-streaming-cycle/event-ingestion";
import {
  createInitialStreamingSystemState,
  emptyUiState,
  MAX_EVENT_POOL_SIZE,
  type FrameDiff,
  type StreamingRuntime,
  type StreamingSystemState,
  type StreamingTickResult,
  type TickConfig,
} from "@/lib/cognitive-streaming-cycle/types";
import { renderSurfaceUi } from "@/lib/surface-render-contract/render-surface-ui";
import { routeSurfaces } from "@/lib/surface-router/route-surfaces";
import { evaluateVisibility } from "@/lib/visibility-bridge/evaluate-visibility";

export type RunStreamingTickInput = {
  incomingEvents?: readonly EventStream[];
  systemState?: StreamingSystemState;
  tickConfig: TickConfig;
  runtime: StreamingRuntime;
  now?: number;
};

export type RunStreamingTickOutput = {
  result: StreamingTickResult;
  runtime: StreamingRuntime;
  systemState: StreamingSystemState;
};

function mergeFeedbackIntoContext(
  context: CognitiveContext,
  previousContext: CognitiveContext | null,
  feedbackState: FeedbackState | null
): CognitiveContext {
  if (!feedbackState && !previousContext) {
    return context;
  }

  return {
    ...context,
    attentionState: feedbackState?.attentionState ?? context.attentionState,
    suppressionMap: {
      ...(previousContext?.suppressionMap ?? {}),
      ...context.suppressionMap,
      ...(feedbackState?.suppressionMap ?? {}),
    },
  };
}

function resolveNow(inputNow: number | undefined, runtime: StreamingRuntime, tickConfig: TickConfig): number {
  if (inputNow != null) {
    return inputNow;
  }
  return runtime.lastTickAt + tickConfig.intervalMs;
}

function buildTickId(sequence: number, now: number): string {
  return `tick-${sequence}-${now}`;
}

/** CognitiveStreamingCycle v1 — one streaming heartbeat tick. */
export function runStreamingTick(input: RunStreamingTickInput): RunStreamingTickOutput {
  const executionLog: string[] = [];
  const systemState = input.systemState ?? createInitialStreamingSystemState();
  const incomingEvents = input.incomingEvents ?? [];
  const now = resolveNow(input.now, input.runtime, input.tickConfig);
  const tickSequence = input.runtime.tickSequence + 1;

  executionLog.push("tick:ingest");
  const ingested = ingestEvents(
    incomingEvents,
    input.runtime.eventPool,
    input.tickConfig.maxEventsPerTick,
    input.tickConfig.debounceWindowMs,
    now
  );

  const trimmed = trimEventPool(ingested.nextPool, MAX_EVENT_POOL_SIZE);
  if (trimmed.trimmed > 0) {
    executionLog.push("tick:ingest:trimmed");
  }

  const eventPool = trimmed.pool;
  const processedEventIds = ingested.processedEvents.map((event) => event.id);
  const cognitiveEvents = toCognitiveEvents(eventPool);

  executionLog.push("tick:context:update");
  const builtContext = buildContext(cognitiveEvents, { now });
  const context = mergeFeedbackIntoContext(
    builtContext,
    systemState.lastContext,
    systemState.lastFeedbackState
  );

  executionLog.push("tick:opportunity:update");
  const { opportunities } = rankContextOpportunities({
    context,
    eventPool: cognitiveEvents,
  });

  executionLog.push("tick:visibility:evaluate");
  const { decisions } = evaluateVisibility({
    context,
    opportunities,
  });

  executionLog.push("tick:surface:route");
  const surfaceRoute = routeSurfaces({
    decisions,
    context,
  });

  executionLog.push("tick:surface:render");
  const { uiState: renderedUiState } = renderSurfaceUi({
    decisions,
    opportunities,
    eventPool: cognitiveEvents,
  });

  executionLog.push("tick:feedback:merge");
  const feedbackState = systemState.lastFeedbackState ?? createInitialFeedbackState();

  const gated = applyCommitGate({
    draft: {
      context,
      opportunities,
      decisions,
      surfaceRoute,
      uiState: renderedUiState,
    },
    feedbackState,
    executionLog: [...executionLog],
  });

  executionLog.length = 0;
  executionLog.push(...gated.executionLog);

  const candidateUiState = gated.uiCommit ? gated.uiState : emptyUiState();
  const comparisonBase = systemState.lastUIState ?? emptyUiState();

  executionLog.push("tick:frame:diff");
  const frameDiff: FrameDiff = computeFrameDiff(
    gated.uiCommit ? gated.uiState : comparisonBase,
    comparisonBase
  );

  const gateApproved = gated.uiCommit;
  const meaningfulChange =
    frameDiffIsMeaningful(frameDiff) || processedEventIds.length > 0;
  const shouldCommit = gateApproved && meaningfulChange;

  const committedUiState = shouldCommit
    ? gated.uiState
    : systemState.lastUIState ?? emptyUiState();

  executionLog.push(
    !gateApproved
      ? "tick:commit:blocked"
      : shouldCommit
        ? "tick:commit:approved"
        : "tick:commit:skipped"
  );

  const nextSystemState: StreamingSystemState = {
    lastContext: gated.context,
    lastOpportunities: gated.opportunities,
    lastDecisions: gated.decisions,
    lastUIState: committedUiState,
    lastFeedbackState: feedbackState,
  };

  const nextRuntime: StreamingRuntime = {
    tickSequence,
    eventPool,
    lastTickAt: now,
  };

  return {
    result: {
      tickId: buildTickId(tickSequence, now),
      processedEvents: processedEventIds,
      context: gated.context,
      opportunities: gated.opportunities,
      decisions: gated.decisions,
      uiState: committedUiState,
      uiCommit: shouldCommit,
      frameDiff,
      executionLog,
    },
    runtime: nextRuntime,
    systemState: nextSystemState,
  };
}
