import { getProviderReputation } from "@/lib/marketplace/capability-market-registry";

export type ProviderCandidate = {
  providerId: string;
  unitCost?: number;
};

export type ProviderSelectionContext = {
  /** Higher = prefer lower cost. */
  costWeight?: number;
  speedWeight?: number;
  reliabilityWeight?: number;
};

const DEFAULT_WEIGHTS: Required<ProviderSelectionContext> = {
  costWeight: 0.3,
  speedWeight: 0.35,
  reliabilityWeight: 0.35,
};

/**
 * Deterministic fair provider selection — capabilities stay stable, providers compete.
 */
export function selectFairProvider(
  candidates: readonly ProviderCandidate[],
  context: ProviderSelectionContext = {},
): ProviderCandidate | null {
  if (candidates.length === 0) {
    return null;
  }
  const weights = { ...DEFAULT_WEIGHTS, ...context };
  let best: ProviderCandidate | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const reputation = getProviderReputation(candidate.providerId);
    const unitCost = candidate.unitCost ?? 0.5;
    const costFactor = 1 / (1 + unitCost * 25);
    const score =
      reputation.reliabilityScore * weights.reliabilityWeight +
      reputation.speedScore * weights.speedWeight +
      costFactor * weights.costWeight;

    const rounded = Math.round(score * 10000) / 10000;
    if (rounded > bestScore || (rounded === bestScore && best && candidate.providerId < best.providerId)) {
      bestScore = rounded;
      best = candidate;
    }
  }

  return best;
}
