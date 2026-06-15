import { LEARNED_WEIGHT_BLEND } from "@/lib/hybrid-retrieval/production-score-weights";
import type {
  HybridCandidate,
  HybridCandidateScores,
  HybridRetrievalContext,
  ScoredHybridCandidate,
} from "@/lib/hybrid-retrieval/types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function resolveLearnedWeight(
  candidate: HybridCandidate,
  productWeights?: Record<string, number>,
): number | undefined {
  if (!productWeights) {
    return undefined;
  }

  const byId = productWeights[candidate.id];
  if (typeof byId === "number" && Number.isFinite(byId)) {
    return clamp01(byId);
  }

  const byUrl = productWeights[candidate.url];
  if (typeof byUrl === "number" && Number.isFinite(byUrl)) {
    return clamp01(byUrl);
  }

  return undefined;
}

/** Blend production score with learned product weights from self-learning loop. */
export function applyLearnedProductWeights(input: {
  scored: ScoredHybridCandidate[];
  context?: HybridRetrievalContext;
}): ScoredHybridCandidate[] {
  const productWeights = input.context?.product_weights;
  if (!productWeights || Object.keys(productWeights).length === 0) {
    return input.scored;
  }

  return input.scored.map((candidate) => {
    const learned = resolveLearnedWeight(candidate, productWeights);
    if (learned === undefined) {
      return candidate;
    }

    const base = candidate.scores.final_score;
    const final_score = clamp01(
      base * (1 - LEARNED_WEIGHT_BLEND) + learned * LEARNED_WEIGHT_BLEND,
    );

    const scores: HybridCandidateScores = {
      ...candidate.scores,
      learned_weight: learned,
      final_score,
    };

    return { ...candidate, scores };
  });
}
