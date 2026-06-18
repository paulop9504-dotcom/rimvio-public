import type { AttentionState, CognitiveContext, CognitiveEvent } from "@/lib/context-builder/types";
import { URGENCY_TAGS } from "@/lib/context-builder/types";

export type OpportunityKind = "ACTION" | "REMINDER" | "SUGGESTION" | "REENGAGEMENT";

export type SurfaceHint = "CALENDAR" | "DOCK" | "TIMELINE" | "NARRATION";

/** Decision-ready opportunity for Visibility Engine consumption. */
export type ContextOpportunity = {
  id: string;
  type: OpportunityKind;
  sourceEventIds: string[];
  relevanceScore: number;
  urgencyScore: number;
  intentAlignment: number;
  attentionFit: number;
  finalScore: number;
  recommendedSurfaceHint: SurfaceHint;
  reasonSignals: string[];
};

export type ContextOpportunityResult = {
  opportunities: ContextOpportunity[];
};

export type ContextOpportunityOptions = {
  maxResults?: number;
  /** Minimum finalScore to include — default 0.18 */
  minFinalScore?: number;
};

export const FINAL_SCORE_WEIGHTS = {
  relevance: 0.35,
  urgency: 0.25,
  intentAlignment: 0.25,
  attentionFit: 0.15,
} as const;

export type RankContextInput = {
  context: CognitiveContext;
  eventPool?: readonly CognitiveEvent[];
  options?: ContextOpportunityOptions;
};

export { URGENCY_TAGS };
