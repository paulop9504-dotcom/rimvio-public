import type {
  CandidateAction,
  ProbabilityFieldOutput,
  RankedCandidate,
} from "@/lib/deos/decision/decision-contract-types";

/**
 * Probability Field — ranking only. Default scorer when plugins omit scores.
 */
export function rankCandidates(
  candidates: CandidateAction[],
  options?: { pluginPrior?: Record<string, number> }
): ProbabilityFieldOutput {
  const prior = options?.pluginPrior ?? {};
  const scored = candidates.map((candidate, index) => {
    const pluginBoost = prior[candidate.pluginId] ?? 0;
    const kindBoost =
      candidate.kind === "defer"
        ? 0.1
        : candidate.kind === "ocr_open_date_picker"
          ? 0.4
          : 0.7;
    const score = kindBoost + pluginBoost - index * 0.01;
    return { candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const ranked: RankedCandidate[] = scored.map((row, index) => ({
    candidateId: row.candidate.id,
    rank: index + 1,
    score: row.score,
    confidence: Math.min(1, Math.max(0, row.score)),
  }));

  return {
    ranked,
    fieldVersion: "probability-v1",
  };
}

export function candidateById(
  candidates: CandidateAction[],
  id: string
): CandidateAction | undefined {
  return candidates.find((c) => c.id === id);
}

export function topRanked(
  probability: ProbabilityFieldOutput,
  n: number
): RankedCandidate[] {
  return probability.ranked.slice(0, n);
}

/** After envelope filter — keep ranks contiguous. */
export function filterProbabilityToCandidates(
  probability: ProbabilityFieldOutput,
  candidates: CandidateAction[]
): ProbabilityFieldOutput {
  const ids = new Set(candidates.map((c) => c.id));
  const ranked = probability.ranked
    .filter((row) => ids.has(row.candidateId))
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return {
    ranked,
    fieldVersion: probability.fieldVersion,
  };
}
