#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildTrueCostReceipt } from "../lib/commerce/true-cost-receipt";
import {
  buildCommerceVerdictSubline,
  deriveCommerceVerdictPresentation,
  formatCommerceHeroMetric,
} from "../lib/commerce/commerce-verdict-presentation";

const trueCost = buildTrueCostReceipt({
  title: "북미 아이패드 프로 m4 13인치 256gb",
  domain: "web.joongna.com",
  surfacePrice: 1_300_000,
});

assert.ok(trueCost.available);

const depreciation = deriveCommerceVerdictPresentation({ trueCost });
assert.equal(depreciation?.kind, "depreciation");
assert.equal(depreciation?.verdictHeadline, "보유 손실 예상");
assert.match(depreciation?.subline ?? "", /손실\(감가\) 예상/);
assert.match(formatCommerceHeroMetric(depreciation!.heroMetric), /\/6mo$/);

const overpriced = deriveCommerceVerdictPresentation({
  market: {
    available: true,
    query: "ipad",
    listingPrice: 1_320_000,
    sampleCount: 8,
    filteredCount: 8,
    average: 1_300_000,
    median: 1_300_000,
    minSafe: 1_250_000,
    maxSafe: 1_350_000,
    deltaPercent: 2,
    verdict: "high",
    confidence: "high",
    sources: ["naver"],
    headline: "test",
    detail: "test",
    disclaimer: "test",
  },
  trueCost,
});

assert.equal(overpriced?.kind, "overpriced");
assert.equal(overpriced?.stampLabel, "PASS");
assert.equal(overpriced?.heroMetric.signed, "+");
assert.equal(overpriced?.heroMetric.amount, 20_000);
assert.ok((overpriced?.spectrumPosition ?? 0) > 50);
assert.match(overpriced?.subline ?? "", /안 사는 게 이득/);

const bargain = deriveCommerceVerdictPresentation({
  market: {
    available: true,
    query: "ipad",
    listingPrice: 1_280_000,
    sampleCount: 8,
    filteredCount: 8,
    average: 1_300_000,
    median: 1_300_000,
    minSafe: 1_250_000,
    maxSafe: 1_350_000,
    deltaPercent: -2,
    verdict: "bargain",
    confidence: "high",
    sources: ["naver"],
    headline: "test",
    detail: "test",
    disclaimer: "test",
  },
});

assert.equal(bargain?.kind, "bargain");
assert.equal(bargain?.stampLabel, "CHECK");
assert.equal(bargain?.heroMetric.signed, "-");
assert.ok((bargain?.spectrumPosition ?? 100) < 50);

const pending = deriveCommerceVerdictPresentation({
  market: {
    available: true,
    query: "bag",
    listingPrice: 120_000,
    sampleCount: 1,
    filteredCount: 1,
    average: null,
    median: null,
    minSafe: null,
    maxSafe: null,
    deltaPercent: null,
    verdict: "unknown",
    confidence: "low",
    sources: [],
    headline: "test",
    detail: "test",
    disclaimer: "test",
  },
});

assert.equal(pending?.kind, "pending");
assert.equal(pending?.stampLabel, "PENDING");
assert.equal(pending?.spectrumPosition, 50);

assert.match(
  buildCommerceVerdictSubline({
    listingPrice: 1_320_000,
    medianPrice: 1_300_000,
    trueCost,
  }),
  /시세 대비 2만 원 비쌈 — 안 사는 게 이득/
);

console.log("test-commerce-verdict-presentation: ok");
