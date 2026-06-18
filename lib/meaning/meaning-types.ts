/** Rule-based meaning graph — people × place × experience co-occurrence (no LLM). */

export const MEANING_NODE_KINDS = ["person", "place", "experience"] as const;

export type MeaningNodeKind = (typeof MEANING_NODE_KINDS)[number];

export const MEANING_EDGE_KINDS = [
  "person_place",
  "person_experience",
  "place_experience",
  "person_person",
] as const;

export type MeaningEdgeKind = (typeof MEANING_EDGE_KINDS)[number];

export type MeaningScore = {
  /** Composite 0–100. */
  total: number;
  /** Distinct co-occurrence events. */
  frequency: number;
  /** 0–100 — how recently reinforced. */
  recency: number;
  /** 0–100 — dwell minutes aggregate. */
  duration: number;
  /** 0–100 — shared-event reinforcement. */
  coPresence: number;
  /** Verified capture count backing the edge. */
  verifyCount: number;
};

export type MeaningNode = {
  id: string;
  kind: MeaningNodeKind;
  label: string;
  /** Sum of incident edge totals (ranking). */
  score: number;
  eventCount: number;
};

export type MeaningEdge = {
  id: string;
  kind: MeaningEdgeKind;
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  score: MeaningScore;
  /** Human label — e.g. "민수 = 제주". */
  meaningLabel: string;
  eventIds: readonly string[];
};

export type MeaningGraph = {
  nodes: readonly MeaningNode[];
  edges: readonly MeaningEdge[];
  builtAt: string;
  observationCount: number;
};

/** Minimum co-occurrence count before "=" meaning copy. */
export const MEANING_STRONG_FREQUENCY = 3;

/** Winner must clear this composite to surface in top edges. */
export const MEANING_MIN_EDGE_TOTAL = 25;

/** Recency half-life for score decay (days). */
export const MEANING_RECENCY_HALF_LIFE_DAYS = 90;
