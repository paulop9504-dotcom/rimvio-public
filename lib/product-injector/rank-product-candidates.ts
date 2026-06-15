import { jaccardSimilarity } from "@/lib/commerce/text-similarity";
import { extractSpecHint, hasModelName, hasPriceOrSpec } from "@/lib/product-injector/has-model-name";
import {
  isProductPageUrl,
  scorePurchaseDirectness,
} from "@/lib/product-injector/is-product-page-url";
import type {
  ProductCandidate,
  ProductInjectorContext,
  RawProductCandidate,
} from "@/lib/product-injector/types";

const DEDUP_JACCARD = 0.72;

function formatPriceKrw(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return "가격 확인 필요";
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function queryRelevance(query: string, name: string): number {
  return jaccardSimilarity(query, name);
}

function buildReason(input: {
  directness: number;
  relevance: number;
  urgency?: ProductInjectorContext["urgency"];
  withinBudget: boolean;
}): string {
  if (input.urgency === "HIGH" && input.directness >= 0.7) {
    return "바로 구매 가능한 상품 페이지";
  }
  if (input.withinBudget) {
    return "예산 범위 내 · 구매 페이지";
  }
  if (input.relevance >= 0.45) {
    return "검색어와 높은 일치 · 구매 가능";
  }
  return "실시간 쇼핑 검색 결과";
}

function scoreCandidate(
  raw: RawProductCandidate,
  query: string,
  context?: ProductInjectorContext,
): { score: number; confidence: number; reason: string } | null {
  if (!isProductPageUrl(raw.source_url)) {
    return null;
  }

  if (!hasModelName(raw.name)) {
    return null;
  }

  const specHint = raw.specHint ?? extractSpecHint(raw.name);
  if (!hasPriceOrSpec(raw.name, raw.price, specHint)) {
    return null;
  }

  const directness = scorePurchaseDirectness(raw.source_url);
  const relevance = queryRelevance(query, raw.name);
  const withinBudget =
    !context?.budget || !raw.price || raw.price <= context.budget;

  if (context?.budget && raw.price && raw.price > context.budget) {
    return null;
  }

  let score = directness * 0.45 + relevance * 0.35;
  if (raw.price && raw.price > 0) {
    score += 0.15;
  }
  if (raw.source === "naver_shop") {
    score += 0.05;
  }
  if (context?.urgency === "HIGH") {
    score += directness * 0.1;
  }

  const confidence = Math.min(0.97, 0.45 + score * 0.5);

  return {
    score,
    confidence,
    reason: buildReason({ directness, relevance, urgency: context?.urgency, withinBudget }),
  };
}

function dedupeCandidates(candidates: ProductCandidate[]): ProductCandidate[] {
  const kept: ProductCandidate[] = [];

  for (const candidate of candidates) {
    const duplicate = kept.some(
      (existing) => jaccardSimilarity(existing.name, candidate.name) >= DEDUP_JACCARD,
    );
    if (!duplicate) {
      kept.push(candidate);
    }
  }

  return kept;
}

export function rankProductCandidates(input: {
  query: string;
  raw: RawProductCandidate[];
  context?: ProductInjectorContext;
}): ProductCandidate[] {
  const scored: Array<ProductCandidate & { _score: number }> = [];

  for (const raw of input.raw) {
    const ranked = scoreCandidate(raw, input.query, input.context);
    if (!ranked) {
      continue;
    }

    scored.push({
      name: raw.name.trim(),
      price: formatPriceKrw(raw.price),
      reason: ranked.reason,
      source_url: raw.source_url,
      confidence: Math.round(ranked.confidence * 100) / 100,
      _score: ranked.score,
    });
  }

  scored.sort((a, b) => {
    if (b._score !== a._score) {
      return b._score - a._score;
    }
    return b.confidence - a.confidence;
  });

  const top = scored.map(({ _score: _, ...rest }) => rest);
  return dedupeCandidates(top).slice(0, 3);
}
