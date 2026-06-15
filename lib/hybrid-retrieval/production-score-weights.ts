/** Production-grade hybrid retrieval ranking weights (sum = 1.0). */
export const PRODUCTION_SCORE_WEIGHTS = {
  intent_match: 0.3,
  conversion_rate: 0.2,
  trust_score: 0.15,
  price_fit: 0.1,
  urgency_fit: 0.1,
  context_fit: 0.1,
  freshness_boost: 0.05,
} as const;

export const LEARNED_WEIGHT_BLEND = 0.25;
