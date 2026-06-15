import type { ProductInjectorContext, EmotionalState } from "@/lib/product-injector/types";

export type HybridRetrievalContext = ProductInjectorContext & {
  location?: string;
  /** Learned product weights (0–1) keyed by candidate id or url. */
  product_weights?: Record<string, number>;
};

export type HybridRetrievalInput = {
  user_query: string;
  context?: HybridRetrievalContext;
};

export type DecomposedIntent = {
  intent: string;
  sub_intent: string;
  urgency: "LOW" | "MID" | "HIGH";
  query: string;
  emotional_state: EmotionalState;
};

export type HybridCandidateKind = "product" | "service";

export type HybridCandidate = {
  id: string;
  name: string;
  url: string;
  kind: HybridCandidateKind;
  price?: string;
  evidence: string;
};

export type HybridCandidateScores = {
  intent_match: number;
  conversion_rate: number;
  trust_score: number;
  price_fit: number;
  urgency_fit: number;
  context_fit: number;
  freshness_boost: number;
  final_score: number;
  /** Blended learned weight when product_weights are supplied. */
  learned_weight?: number;
};

export type ScoredHybridCandidate = HybridCandidate & {
  scores: HybridCandidateScores;
};

export type HybridRetrievalItem = {
  name: string;
  url: string;
  score: number;
};

export type HybridRetrievalOutput = {
  intent: string;
  top_pick: HybridRetrievalItem;
  alternatives: HybridRetrievalItem[];
};

export type HybridRetrievalWire = HybridRetrievalOutput & {
  decomposed: DecomposedIntent;
  candidates: ScoredHybridCandidate[];
};
