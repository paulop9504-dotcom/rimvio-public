import type { CognitiveContext } from "@/lib/context-builder/types";
import type { ContextOpportunity } from "@/lib/cognitive-opportunity/types";
import type { FeedbackState } from "@/lib/cognitive-orchestrator/types";
import type { SurfaceUiState } from "@/lib/surface-render-contract/types";
import type { VisibilityDecision } from "@/lib/visibility-bridge/types";

export type StreamingSystemState = {
  lastContext: CognitiveContext | null;
  lastOpportunities: ContextOpportunity[] | null;
  lastDecisions: VisibilityDecision[] | null;
  lastUIState: SurfaceUiState | null;
  lastFeedbackState: FeedbackState | null;
};

export type TickConfig = {
  intervalMs: number;
  maxEventsPerTick: number;
  debounceWindowMs: number;
};

export type FrameDiff = {
  added: string[];
  removed: string[];
  updated: string[];
};

export type StreamingTickResult = {
  tickId: string;
  processedEvents: string[];
  context: CognitiveContext;
  opportunities: ContextOpportunity[];
  decisions: VisibilityDecision[];
  uiState: SurfaceUiState;
  uiCommit: boolean;
  frameDiff: FrameDiff;
  executionLog: string[];
};

export type StreamingRuntime = {
  tickSequence: number;
  eventPool: import("@/lib/cognitive-orchestrator/types").EventStream[];
  lastTickAt: number;
};

export const DEFAULT_TICK_CONFIG: TickConfig = {
  intervalMs: 1_000,
  maxEventsPerTick: 25,
  debounceWindowMs: 300,
};

export const MAX_EVENT_POOL_SIZE = 500;

export function createInitialStreamingSystemState(): StreamingSystemState {
  return {
    lastContext: null,
    lastOpportunities: null,
    lastDecisions: null,
    lastUIState: null,
    lastFeedbackState: null,
  };
}

export function createStreamingRuntime(now: number = Date.now()): StreamingRuntime {
  return {
    tickSequence: 0,
    eventPool: [],
    lastTickAt: now,
  };
}

export function emptyUiState(): SurfaceUiState {
  return {
    CALENDAR: [],
    DOCK: [],
    TIMELINE: [],
    NARRATION: [],
  };
}
