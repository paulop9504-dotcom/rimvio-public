/** Rule-based relationship MEANING — people-centric narrative frames (no LLM). */

export const RELATIONSHIP_MEANING_FRAMES = [
  "repetition",
  "emergence",
  "dormancy",
  "spread",
] as const;

export type RelationshipMeaningFrame = (typeof RELATIONSHIP_MEANING_FRAMES)[number];

export type RelationshipFrequencyTrend = "rising" | "steady" | "falling";

export type RelationshipFacts = {
  peerDisplayName: string;
  contextCount: number;
  distinctPlaces: number;
  daysSinceLast: number;
  spanDays: number;
  topPlace: string | null;
  milestoneRatio: number;
  frequencyTrend: RelationshipFrequencyTrend;
  verifiedCaptureCount: number;
};

export type RelationshipPatternMatch = {
  frame: RelationshipMeaningFrame;
  /** 0–1 strength for ranking. */
  score: number;
};

export type RelationshipMeaningProjection = {
  frame: RelationshipMeaningFrame;
  line: string;
  factAnchor: string;
  confidence: number;
  peerDisplayName: string;
};

/** Minimum confidence before surfacing MEANING copy in UI. */
export const RELATIONSHIP_MEANING_MIN_CONFIDENCE = 0.65;
