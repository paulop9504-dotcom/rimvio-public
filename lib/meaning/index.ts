export {
  MEANING_EDGE_KINDS,
  MEANING_MIN_EDGE_TOTAL,
  MEANING_NODE_KINDS,
  MEANING_RECENCY_HALF_LIFE_DAYS,
  MEANING_STRONG_FREQUENCY,
  type MeaningEdge,
  type MeaningEdgeKind,
  type MeaningGraph,
  type MeaningNode,
  type MeaningNodeKind,
  type MeaningScore,
} from "@/lib/meaning/meaning-types";

export {
  meaningEdgeId,
  meaningNodeId,
  normalizeMeaningExperience,
  normalizeMeaningPerson,
  normalizeMeaningPlace,
} from "@/lib/meaning/meaning-node-id";

export {
  extractMeaningObservations,
  type MeaningObservation,
} from "@/lib/meaning/extract-meaning-observations";

export {
  createMeaningEdgeAccumulator,
  scoreMeaningEdge,
  type MeaningEdgeAccumulator,
} from "@/lib/meaning/score-meaning-edge";

export { formatMeaningLabel } from "@/lib/meaning/format-meaning-label";

export { buildMeaningGraph } from "@/lib/meaning/build-meaning-graph";

export {
  findMeaningEdge,
  topMeaningEdges,
  topMeaningNodes,
} from "@/lib/meaning/rank-meaning-graph";

export {
  RELATIONSHIP_MEANING_FRAMES,
  RELATIONSHIP_MEANING_MIN_CONFIDENCE,
  type RelationshipFacts,
  type RelationshipFrequencyTrend,
  type RelationshipMeaningFrame,
  type RelationshipMeaningProjection,
  type RelationshipPatternMatch,
} from "@/lib/meaning/relationship-meaning-types";

export { collectRelationshipFacts } from "@/lib/meaning/collect-relationship-facts";
export { detectRelationshipPatterns } from "@/lib/meaning/detect-relationship-patterns";
export { rankRelationshipFrame } from "@/lib/meaning/rank-relationship-frame";
