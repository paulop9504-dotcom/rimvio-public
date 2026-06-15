#!/usr/bin/env npx tsx
/**
 * URL tracking param stripper.
 * Usage: npm run test:clean-url
 */

import assert from "node:assert/strict";
import { cleanUrl, cleanUrlSafe } from "../lib/share/clean-url";

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

test("strips utm and fbclid from YouTube share link", () => {
  const raw =
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=share&utm_medium=copy&si=abc123&fbclid=IwAR123";
  const cleaned = cleanUrl(raw);
  assert.equal(
    cleaned,
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
});

test("strips gclid but keeps product id", () => {
  const raw =
    "https://www.coupang.com/vp/products/12345?itemId=99&gclid=abc&utm_campaign=spring";
  const cleaned = cleanUrl(raw);
  assert.equal(
    cleaned,
    "https://www.coupang.com/vp/products/12345?itemId=99"
  );
});

test("adds https when missing", () => {
  assert.equal(
    cleanUrl("naver.com/news/123?utm_source=app"),
    "https://naver.com/news/123"
  );
});

test("cleanUrlSafe returns null on empty input", () => {
  assert.equal(cleanUrlSafe(""), null);
  assert.equal(cleanUrlSafe("   "), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
