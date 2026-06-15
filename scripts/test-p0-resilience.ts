#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { shouldSkipCaptureGemini } from "../lib/capture/commerce-capture-fast-path";
import { buildProvisionalMarketSnapshot } from "../lib/commerce/client-market-estimate";
import {
  deriveCommerceVerdictPresentation,
  isEstimatedMarketSnapshot,
} from "../lib/commerce/commerce-verdict-presentation";
import {
  marketPriceCacheKey,
  marketPriceCacheTtlMs,
} from "../lib/server/market-price-cache";
import {
  isScraperCircuitOpen,
  recordScraperFailure,
  resetScraperCircuitsForTests,
  scraperCircuitSnapshot,
} from "../lib/commerce/scraper-circuit-breaker";

assert.equal(
  shouldSkipCaptureGemini("북미 아이패드 프로 m4 13인치 256gb 1,300,000원"),
  true
);
assert.equal(shouldSkipCaptureGemini("흐릿한 메모"), false);

const provisional = buildProvisionalMarketSnapshot({
  title: "[급처] 아이폰 15 프로 256GB 850,000원",
  domain: "web.joongna.com",
});

assert.ok(provisional);
assert.notEqual(provisional!.verdict, "unknown");
assert.ok(isEstimatedMarketSnapshot(provisional));

const presentation = deriveCommerceVerdictPresentation({
  market: provisional,
});
assert.match(presentation?.stampLabel ?? "", /^EST\./);

assert.ok(marketPriceCacheKey({ query: "ipad", domain: "joongna.com", listingPrice: 100 }).length === 64);
assert.equal(marketPriceCacheTtlMs("web.joongna.com"), 6 * 60 * 60 * 1000);

resetScraperCircuitsForTests();
assert.equal(isScraperCircuitOpen("bunjang"), false);
for (let i = 0; i < 5; i += 1) {
  recordScraperFailure("bunjang");
}
assert.equal(isScraperCircuitOpen("bunjang"), true);
assert.ok(scraperCircuitSnapshot("bunjang").openUntil > Date.now());

console.log("test-p0-resilience: ok");
