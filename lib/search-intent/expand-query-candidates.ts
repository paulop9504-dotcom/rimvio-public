import type { QueryCandidate, SemanticFrame } from "@/lib/search-intent/types";

const BRAND_EXPANSIONS: Record<string, string[]> = {
  쿠우쿠우: ["뷔페", "가격"],
  스타벅스: ["메뉴", "영업시간"],
  CGV: ["상영시간표", "예매"],
  메가박스: ["상영시간표", "예매"],
  쿠팡: ["배송", "가격"],
};

const INTENT_PHRASES: Record<string, string[]> = {
  price_inquiry: ["가격", "요금"],
  place_search: ["맛집", "추천"],
  navigation: ["길찾기"],
  hours_inquiry: ["영업시간"],
  reservation: ["예약"],
  review_inquiry: ["리뷰", "후기"],
  general_search: [],
};

export function uniqueJoin(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const trimmed = part.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(trimmed);
  }
  return out.join(" ");
}

function canonicalQuery(frame: SemanticFrame): string {
  const intentWords = INTENT_PHRASES[frame.intent] ?? [];
  const modifierWords = frame.modifiers.filter(
    (mod) => !intentWords.some((word) => mod.toLowerCase().includes(word.toLowerCase()))
  );

  return uniqueJoin([...frame.entities, ...modifierWords, ...intentWords.slice(0, 1)]);
}

function expandedQuery(frame: SemanticFrame, canonical: string): string {
  const extras: string[] = [];

  for (const entity of frame.entities) {
    const brandKey = Object.keys(BRAND_EXPANSIONS).find((key) =>
      entity.toLowerCase().includes(key.toLowerCase())
    );
    if (brandKey) {
      extras.push(...(BRAND_EXPANSIONS[brandKey] ?? []));
    }
  }

  if (frame.intent === "price_inquiry") {
    extras.push("메뉴판");
  }
  if (frame.intent === "place_search") {
    extras.push("베스트");
  }

  return uniqueJoin([canonical, ...extras.slice(0, 2)]);
}

function localIntentQuery(frame: SemanticFrame, canonical: string): string {
  const geo = frame.entities.find((entity) =>
    /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|역|구|동)/u.test(entity)
  );

  if (frame.intent === "price_inquiry") {
    const brand = frame.entities.find((entity) => !geo || entity !== geo) ?? frame.entities[0];
    if (brand) {
      return uniqueJoin([brand, "이용 요금", geo ?? ""]);
    }
  }

  if (frame.intent === "place_search" && geo) {
    return uniqueJoin([geo, "맛집 추천", ...frame.modifiers.slice(0, 1)]);
  }

  if (geo) {
    return uniqueJoin([canonical, geo, "근처"]);
  }

  return uniqueJoin([canonical, "근처"]);
}

export function expandQueryCandidates(frame: SemanticFrame): QueryCandidate[] {
  const canonical = canonicalQuery(frame) || frame.raw || frame.context;
  const expanded = expandedQuery(frame, canonical);
  const local = localIntentQuery(frame, canonical);

  return [
    { kind: "canonical", query: canonical, score: 0 },
    { kind: "expanded", query: expanded, score: 0 },
    { kind: "local_intent", query: local, score: 0 },
  ].filter((candidate) => candidate.query.trim());
}
