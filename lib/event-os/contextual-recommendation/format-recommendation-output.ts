import type { RecommendationResult } from "@/lib/event-os/contextual-recommendation/recommendation-types";

export function formatRecommendationSummary(
  result: RecommendationResult
): string {
  const lines = result.rankedCandidates.map(
    (row, index) => `${index + 1}. ${row.item} (${row.score}점)`
  );
  return ["오늘 이렇게 가는 게 좋아 보여요:", ...lines].join("\n");
}

export function formatExplanationBlock(
  result: RecommendationResult
): string {
  const blocks = result.explanationTrace.map((trace) => {
    const bullets = trace.lines.map((line) => `  - ${line.rationale}`);
    return `${trace.item}:\n${bullets.join("\n")}`;
  });
  return blocks.join("\n\n");
}
