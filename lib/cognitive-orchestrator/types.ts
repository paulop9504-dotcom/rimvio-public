import type { CognitiveContext } from "@/lib/context-builder/types";
import type { ContextOpportunity } from "@/lib/cognitive-opportunity/types";
import type { SurfaceBiasMap, UserInteractionEvent } from "@/lib/event-feedback-loop/types";
import type { SurfaceUiState } from "@/lib/surface-render-contract/types";
import type { SurfaceRouterResult } from "@/lib/surface-router/types";
import type { VisibilityDecision } from "@/lib/visibility-bridge/types";

export type EventStream = {
  id: string;
  type: string;
  timestamp: number;
  payload: unknown;
};

export type FeedbackState = {
  suppressionMap: Record<string, number>;
  surfaceBias: SurfaceBiasMap;
  opportunityHistory: Record<string, number>;
  attentionState: CognitiveContext["attentionState"];
  driftSignals: string[];
};

export type SystemState = {
  contextCache?: CognitiveContext | null;
  opportunityCache?: ContextOpportunity[] | null;
  visibilityCache?: VisibilityDecision[] | null;
  surfaceState?: SurfaceRouterResult | null;
  feedbackState: FeedbackState;
};

export type CognitiveOrchestratorInput = {
  eventStream: readonly EventStream[];
  systemState: SystemState;
  userInteractions?: readonly UserInteractionEvent[];
  now?: number;
};

/** v1 result — raw pipeline outputs (no commit gate). */
export type CognitiveOrchestratorResult = {
  context: CognitiveContext;
  opportunities: ContextOpportunity[];
  decisions: VisibilityDecision[];
  uiState: SurfaceUiState;
  feedbackState: FeedbackState;
  executionLog: string[];
};

/**
 * v2 result — guard-sanitized outputs with atomic UI commit flag.
 * When uiCommit=false, uiState is empty; consumer must retain last committed frame.
 */
export type CognitiveOrchestratorV2Result = {
  context: CognitiveContext;
  opportunities: ContextOpportunity[];
  decisions: VisibilityDecision[];
  uiState: SurfaceUiState;
  feedbackState: FeedbackState;
  isValid: boolean;
  uiCommit: boolean;
  warnings: string[];
  criticalIssues: string[];
  systemHealthScore: number;
  executionLog: string[];
  surfaceRoute: SurfaceRouterResult;
};

export function createInitialFeedbackState(): FeedbackState {
  return {
    suppressionMap: {},
    surfaceBias: {
      CALENDAR: 0.5,
      DOCK: 0.5,
      TIMELINE: 0.5,
      NARRATION: 0.5,
    },
    opportunityHistory: {},
    attentionState: "IDLE",
    driftSignals: [],
  };
}

export function createInitialSystemState(): SystemState {
  return {
    contextCache: null,
    opportunityCache: null,
    visibilityCache: null,
    surfaceState: null,
    feedbackState: createInitialFeedbackState(),
  };
}
