import type { AttentionState, CognitiveContext } from "@/lib/context-builder/types";
import type { ContextOpportunity, SurfaceHint } from "@/lib/cognitive-opportunity/types";

export type VisibilitySurface = SurfaceHint;

export type VisibilityDecision = {
  opportunityId: string;
  visible: boolean;
  surface: VisibilitySurface | null;
  visibilityScore: number;
  confidence: number;
  finalSurface: string;
  tieBreakReason: string;
  suppressionApplied: number;
};

export type VisibilityBridgeResult = {
  decisions: VisibilityDecision[];
};

export type VisibilityBridgeOptions = {
  maxDecisions?: number;
  /** visibilityScore below this → hidden — default 0.35 */
  visibilityThreshold?: number;
};

export type EvaluateVisibilityInput = {
  context: CognitiveContext;
  opportunities: readonly ContextOpportunity[];
  options?: VisibilityBridgeOptions;
};

export const VISIBILITY_SCORE_WEIGHTS = {
  finalScore: 0.6,
  attentionFit: 0.2,
  urgency: 0.2,
} as const;

export const SURFACE_TIEBREAK_PRIORITY: readonly VisibilitySurface[] = [
  "CALENDAR",
  "DOCK",
  "TIMELINE",
  "NARRATION",
];

export const VISIBLE_CAP_BY_ATTENTION: Record<AttentionState, number> = {
  FOCUSED: 3,
  SCATTERED: 2,
  IDLE: 4,
};
