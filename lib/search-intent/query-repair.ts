import { uniqueJoin } from "@/lib/search-intent/expand-query-candidates";
import type { QueryCandidate, SemanticFrame } from "@/lib/search-intent/types";

function joinFromFrame(frame: SemanticFrame): string {
  const intentWord =
    frame.intent === "price_inquiry"
      ? "가격"
      : frame.intent === "place_search"
        ? "맛집 추천"
        : frame.intent === "navigation"
          ? "길찾기"
          : frame.intent === "hours_inquiry"
            ? "영업시간"
            : frame.intent === "reservation"
              ? "예약"
              : frame.intent === "review_inquiry"
                ? "리뷰"
                : "";

  return uniqueJoin([...frame.entities, ...frame.modifiers.slice(0, 2), intentWord, frame.context]);
}

/** Regenerate candidates when ranked score falls below threshold. */
export function repairQueryCandidates(
  frame: SemanticFrame,
  candidates: QueryCandidate[]
): QueryCandidate[] {
  const repairedBase = joinFromFrame(frame);
  if (!repairedBase.trim()) {
    return candidates;
  }

  const repaired: QueryCandidate[] = [
    { kind: "canonical", query: repairedBase, score: 0 },
    ...candidates.map((candidate) => ({
      ...candidate,
      query: uniqueJoin([repairedBase, candidate.query]),
    })),
  ];

  const seen = new Set<string>();
  return repaired.filter((candidate) => {
    const key = candidate.query.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return candidate.query.trim().length > 0;
  });
}
