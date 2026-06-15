import { buildItemExplanation } from "@/lib/event-os/contextual-recommendation/build-item-explanation";
import { scoreFoodCandidate } from "@/lib/event-os/contextual-recommendation/score-food-candidate";
import type {
  FoodCandidate,
  ItemExplanationTrace,
  RankedCandidate,
  RecommendationConstraints,
  RecommendationContext,
} from "@/lib/event-os/contextual-recommendation/recommendation-types";

export function rankFoodCandidates(input: {
  candidates: FoodCandidate[];
  context: RecommendationContext;
  constraints: RecommendationConstraints;
  topN?: number;
}): {
  ranked: RankedCandidate[];
  explanations: ItemExplanationTrace[];
} {
  const topN = input.topN ?? 3;

  const scored = input.candidates.map((candidate) => {
    const breakdown = scoreFoodCandidate({
      candidate,
      context: input.context,
      constraints: input.constraints,
    });
    return {
      candidate,
      breakdown,
      score: breakdown.total,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.candidate.item.localeCompare(b.candidate.item, "ko");
  });

  const top = scored.slice(0, topN);

  const ranked: RankedCandidate[] = top.map((row) => ({
    item: row.candidate.item,
    score: row.score,
    breakdown: row.breakdown,
  }));

  const explanations = top.map((row) =>
    buildItemExplanation({
      candidate: row.candidate,
      context: input.context,
      constraints: input.constraints,
      breakdown: row.breakdown,
    })
  );

  return { ranked, explanations };
}
