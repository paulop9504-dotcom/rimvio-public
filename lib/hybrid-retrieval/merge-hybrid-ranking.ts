import type {
  HybridRetrievalItem,
  HybridRetrievalOutput,
  HybridRetrievalWire,
  ScoredHybridCandidate,
} from "@/lib/hybrid-retrieval/types";

function toItem(candidate: ScoredHybridCandidate): HybridRetrievalItem {
  return {
    name: candidate.name,
    url: candidate.url,
    score: candidate.scores.final_score,
  };
}

/** Step 4 — merge ranking → top_pick + alternatives (max 3 total). */
export function buildHybridRetrievalOutput(input: {
  intent: string;
  scored: ScoredHybridCandidate[];
}): HybridRetrievalOutput | null {
  const ranked = [...input.scored].sort(
    (a, b) => b.scores.final_score - a.scores.final_score,
  );

  if (ranked.length === 0) {
    return null;
  }

  const top = ranked[0]!;
  const alternatives = ranked.slice(1, 3).map(toItem);

  return {
    intent: input.intent,
    top_pick: toItem(top),
    alternatives,
  };
}

export function buildHybridRetrievalWire(
  decomposed: HybridRetrievalWire["decomposed"],
  scored: ScoredHybridCandidate[],
): HybridRetrievalWire | null {
  const output = buildHybridRetrievalOutput({
    intent: decomposed.intent,
    scored,
  });
  if (!output) {
    return null;
  }

  return {
    ...output,
    decomposed,
    candidates: scored,
  };
}
