import { allEntitiesPreserved } from "@/lib/search-intent/entity-lock";
import type { QueryCandidate, SearchIntent, SemanticFrame } from "@/lib/search-intent/types";

const INTENT_KEYWORDS: Record<SearchIntent, RegExp> = {
  price_inquiry: /(?:가격|요금|비용|얼마|price|cost|메뉴)/iu,
  place_search: /(?:맛집|추천|카페|식당|베스트|근처|spot|place)/iu,
  navigation: /(?:길찾|내비|네비|navigation|navigate)/iu,
  hours_inquiry: /(?:영업|몇\s*시|휴무|open|closed)/iu,
  reservation: /(?:예약|booking|reserve)/iu,
  review_inquiry: /(?:리뷰|후기|평점|review)/iu,
  general_search: /./u,
};

function entityMatchScore(query: string, entities: string[]): number {
  if (entities.length === 0) {
    return 0.15;
  }
  if (!allEntitiesPreserved(query, entities)) {
    return 0;
  }
  return 0.4;
}

function intentMatchScore(query: string, intent: SearchIntent): number {
  const pattern = INTENT_KEYWORDS[intent];
  if (!pattern) {
    return 0.1;
  }
  return pattern.test(query) ? 0.3 : intent === "general_search" ? 0.15 : 0.05;
}

function localityMatchScore(query: string, frame: SemanticFrame): number {
  const geoEntities = frame.entities.filter((entity) =>
    /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|역|구|동)/u.test(entity)
  );
  if (geoEntities.length === 0) {
    return 0.1;
  }
  const lower = query.toLowerCase();
  const hits = geoEntities.filter((entity) => lower.includes(entity.toLowerCase())).length;
  return Math.min(0.2, (hits / geoEntities.length) * 0.2);
}

function freshnessBias(kind: QueryCandidate["kind"]): number {
  if (kind === "canonical") {
    return 0.1;
  }
  if (kind === "expanded") {
    return 0.05;
  }
  return 0;
}

export function scoreQueryCandidate(frame: SemanticFrame, candidate: QueryCandidate): number {
  const query = candidate.query.trim();
  if (!query) {
    return 0;
  }

  return Math.min(
    1,
    entityMatchScore(query, frame.entities) +
      intentMatchScore(query, frame.intent) +
      localityMatchScore(query, frame) +
      freshnessBias(candidate.kind)
  );
}

export function rankQueryCandidates(
  frame: SemanticFrame,
  candidates: QueryCandidate[]
): QueryCandidate[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreQueryCandidate(frame, candidate),
    }))
    .sort((a, b) => b.score - a.score || (a.kind === "canonical" ? -1 : 1));
}

export const QUERY_SCORE_REPAIR_THRESHOLD = 0.45;
