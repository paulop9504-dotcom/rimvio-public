export type {
  RecommendationResult,
  RecommendationContext,
  RecommendationConstraints,
  RecommendationInput,
  RankedCandidate,
  ItemExplanationTrace,
} from "@/lib/event-os/contextual-recommendation/recommendation-types";

export { recommendFromContext } from "@/lib/event-os/contextual-recommendation/recommend-from-context";
export { extractRecommendationContext } from "@/lib/event-os/contextual-recommendation/extract-recommendation-context";
export { buildRecommendationConstraints } from "@/lib/event-os/contextual-recommendation/build-recommendation-constraints";
export { orchestrateContextualMealRecommendation } from "@/lib/event-os/contextual-recommendation/orchestrate-contextual-meal";
export {
  formatRecommendationSummary,
  formatExplanationBlock,
} from "@/lib/event-os/contextual-recommendation/format-recommendation-output";
