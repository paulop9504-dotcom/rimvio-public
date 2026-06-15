#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { applyLearnedProductWeights } from "../lib/hybrid-retrieval/apply-learned-weights";
import { decomposeHybridIntent } from "../lib/hybrid-retrieval/decompose-intent";
import { PRODUCTION_SCORE_WEIGHTS } from "../lib/hybrid-retrieval/production-score-weights";
import {
  mergeProductionScore,
  scoreCandidatesDeterministic,
} from "../lib/hybrid-retrieval/score-candidates-deterministic";
import { buildHybridRetrievalOutput } from "../lib/hybrid-retrieval/merge-hybrid-ranking";
import type { HybridCandidate } from "../lib/hybrid-retrieval/types";

const weightSum = Object.values(PRODUCTION_SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0);
assert.ok(Math.abs(weightSum - 1) < 0.001, "production weights must sum to 1");

const decomposed = decomposeHybridIntent("무선 이어폰 20만원 이하 추천", {
  budget: 200_000,
  urgency: "HIGH",
  location: "서울",
  emotional_state: "urgency",
});
assert.ok(decomposed);

const candidates: HybridCandidate[] = [
  {
    id: "product-0",
    name: "Sony WH-1000XM5 무선 이어폰",
    url: "https://shopping.naver.com/product/sony-xm5",
    kind: "product",
    price: "189,000원",
    evidence: "web:naver_shop",
  },
  {
    id: "product-1",
    name: "일반 이어폰",
    url: "https://example.com/listing",
    kind: "product",
    price: "350,000원",
    evidence: "web:naver_shop_web",
  },
  {
    id: "service-0",
    name: "배민",
    url: "https://baemin.com",
    kind: "service",
    evidence: "service:baemin",
  },
];

const scored = scoreCandidatesDeterministic({
  decomposed: decomposed!,
  candidates,
  context: {
    budget: 200_000,
    urgency: "HIGH",
    location: "서울",
    emotional_state: "urgency",
  },
});

assert.equal(scored.length, 3);
for (const entry of scored) {
  assert.ok(entry.scores.intent_match >= 0 && entry.scores.intent_match <= 1);
  assert.ok(entry.scores.price_fit >= 0 && entry.scores.price_fit <= 1);
  assert.ok(entry.scores.context_fit >= 0 && entry.scores.context_fit <= 1);
  assert.equal(
    entry.scores.final_score,
    mergeProductionScore(entry.scores),
    `final_score mismatch for ${entry.id}`,
  );
}

const withinBudget = scored.find((entry) => entry.id === "product-0")!;
const overBudget = scored.find((entry) => entry.id === "product-1")!;
assert.ok(withinBudget.scores.price_fit > overBudget.scores.price_fit);

const weighted = applyLearnedProductWeights({
  scored,
  context: {
    product_weights: {
      "product-0": 0.92,
      "product-1": 0.15,
    },
  },
});
const boosted = weighted.find((entry) => entry.id === "product-0")!;
const penalized = weighted.find((entry) => entry.id === "product-1")!;
assert.ok(boosted.scores.final_score >= withinBudget.scores.final_score);
assert.ok(penalized.scores.final_score <= overBudget.scores.final_score);
assert.equal(boosted.scores.learned_weight, 0.92);

const output = buildHybridRetrievalOutput({
  intent: decomposed!.intent,
  scored: weighted,
});
assert.ok(output);
assert.ok(output!.alternatives.length <= 2);
assert.ok(output!.top_pick.score >= (output!.alternatives[0]?.score ?? 0));

console.log("test-hybrid-retrieval: ok");
