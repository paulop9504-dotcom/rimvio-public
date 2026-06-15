#!/usr/bin/env npx tsx
/**
 * URL metadata parse + rule-based intent classification.
 * Usage: npm run test:url-intent
 */

import assert from "node:assert/strict";
import {
  classifyUrlIntentByRules,
  classifyUrlIntentFromRouter,
} from "../lib/intent/gemini-url-intent";
import { parseUrlPageMetadata } from "../lib/share/scrape-url-metadata";

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

test("parseUrlPageMetadata extracts title and og fields", () => {
  const html = `<!doctype html><html><head>
    <title>Fallback Title</title>
    <meta property="og:title" content="OG Title Here" />
    <meta property="og:description" content="Short summary." />
  </head><body></body></html>`;

  const meta = parseUrlPageMetadata(
    html,
    "https://brunch.co.kr/@user/123"
  );

  assert.equal(meta.title, "Fallback Title");
  assert.equal(meta.ogTitle, "OG Title Here");
  assert.equal(meta.ogDescription, "Short summary.");
  assert.equal(meta.domain, "brunch.co.kr");
});

test("rules classify YouTube as media", () => {
  const result = classifyUrlIntentByRules({
    url: "https://youtu.be/abc123",
    domain: "youtu.be",
    title: "Live performance",
  });

  assert.equal(result.category, "media");
  assert.equal(result.suggested_action, "재생/시청");
  assert.equal(result.fallback, "rules");
});

test("rules classify Coupang as commerce", () => {
  const result = classifyUrlIntentByRules({
    url: "https://www.coupang.com/vp/products/1",
    domain: "coupang.com",
    title: "무선 이어폰",
  });

  assert.equal(result.category, "commerce");
  assert.equal(result.suggested_action, "가격 확인/장바구니");
});

test("rules classify news article", () => {
  const result = classifyUrlIntentByRules({
    url: "https://www.yna.co.kr/view/AKR20240101001",
    domain: "yna.co.kr",
    title: "속보: 정부 발표",
    description: "오늘 기자회견 뉴스",
  });

  assert.equal(result.category, "article");
  assert.equal(result.suggested_action, "3줄 요약/나중에 읽기");
});

test("rules return unknown for generic homepage", () => {
  const result = classifyUrlIntentByRules({
    url: "https://example.com/",
    domain: "example.com",
  });

  assert.equal(result.category, "unknown");
  assert.equal(result.suggested_action, null);
});

test("intelligent-router short-circuit for Coupang", () => {
  const result = classifyUrlIntentFromRouter({
    url: "https://www.coupang.com/vp/products/1",
    domain: "coupang.com",
    title: "무선 이어폰",
  });

  assert.equal(result?.category, "commerce");
  assert.ok((result?.confidence_score ?? 0) >= 0.82);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
