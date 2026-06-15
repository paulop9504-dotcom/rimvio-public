#!/usr/bin/env npx tsx
/**
 * Intelligent link router — category scoring + commerce/news branch.
 * Usage: npm run test:router
 */

import assert from "node:assert/strict";
import { routeLink } from "../lib/routing/intelligent-router";
import { isCommerceDomain } from "../lib/enrichers/url-intelligence";
import { detectSmartSuites } from "../lib/actions/smart-suite-actions";
import { filterSuitesByRouting } from "../lib/routing/apply-routing";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

test("joongna routes to shopping commerce_compare", () => {
  const result = routeLink({
    url: "https://web.joongna.com/product/12345",
    domain: "web.joongna.com",
    title: "아이폰 15 프로 중고 판매 850,000원",
  });

  assert.equal(result.winner, "shopping");
  assert.equal(result.mode, "commerce_compare");
  assert.ok(result.confidence >= 0.5);
  assert.equal(result.needsFallback, false);
});

test("bunjang routes to shopping commerce_compare", () => {
  const result = routeLink({
    url: "https://m.bunjang.co.kr/products/999",
    domain: "m.bunjang.co.kr",
    title: "맥북 에어 M2 직거래",
  });

  assert.equal(result.winner, "shopping");
  assert.equal(result.mode, "commerce_compare");
  assert.ok(result.confidence >= 0.7);
});

test("news article routes to research news_summary", () => {
  const result = routeLink({
    url: "https://www.yna.co.kr/view/AKR20240101001",
    domain: "yna.co.kr",
    title: "속보: 정부, 새 정책 발표",
    description: "오늘 기자회견에서 발표된 뉴스 요약",
  });

  assert.equal(result.winner, "research");
  assert.equal(result.mode, "news_summary");
  assert.ok(result.confidence >= 0.5);
});

test("ambiguous link triggers ask_user fallback", () => {
  const result = routeLink({
    url: "https://example.com/page/123",
    domain: "example.com",
    title: "Welcome",
  });

  assert.equal(result.mode, "ask_user");
  assert.equal(result.needsFallback, true);
  assert.ok(result.confidence < 0.5);
});

test("second-hand domains are commerce domains", () => {
  assert.ok(isCommerceDomain("web.joongna.com"));
  assert.ok(isCommerceDomain("m.bunjang.co.kr"));
  assert.ok(isCommerceDomain("www.daangn.com"));
});

test("commerce route blocks intellectual smart suite", () => {
  const routing = routeLink({
    url: "https://web.joongna.com/product/1",
    domain: "web.joongna.com",
    title: "기사처럼 보이는 중고 상품 제목 news blog",
  });

  const suites = detectSmartSuites({
    sourceUrl: "https://web.joongna.com/product/1",
    domain: "web.joongna.com",
    title: "기사처럼 보이는 중고 상품 제목 news blog",
    routing,
  });

  assert.ok(!suites.includes("intellectual"));
  assert.ok(suites.includes("decision"));
});

test("filterSuitesByRouting prioritizes decision over intellectual for commerce", () => {
  const routing = routeLink({
    url: "https://www.coupang.com/vp/123",
    domain: "www.coupang.com",
    title: "무선 이어폰",
  });

  const filtered = filterSuitesByRouting(["intellectual", "decision"], routing);
  assert.ok(filtered.includes("decision"));
  assert.ok(!filtered.includes("intellectual"));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
