#!/usr/bin/env npx tsx
/**
 * Screenshot intent classification + action building.
 * Usage: npm run test:screenshot
 */

import assert from "node:assert/strict";
import { UNIVERSAL_PILLAR_LABEL } from "../lib/actions/universal-action-pillar";
import { buildScreenshotActions } from "../lib/screenshot/build-screenshot-actions";
import { classifyScreenshotText } from "../lib/screenshot/classify-intent";

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

test("cafe screenshot text routes to place intent", () => {
  const intent = classifyScreenshotText(
    "성수동 카페 온더룩\n서울 성동구 연무장17길 4\ninstagram · 좋아요 1,204"
  );

  assert.ok(intent);
  assert.equal(intent!.kind, "place");
  assert.match(intent!.query, /온더룩|성수|연무장/i);
});

test("product screenshot text routes to product intent", () => {
  const intent = classifyScreenshotText(
    "Sony WH-1000XM5\nNoise cancelling headphones\n₩429,000\n무료배송"
  );

  assert.ok(intent);
  assert.equal(intent!.kind, "product");
  assert.match(intent!.query, /Sony|WH-1000XM5/i);
});

test("ocr text with url delegates to url intent", () => {
  const intent = classifyScreenshotText(
    "Check this https://web.joongna.com/product/12345 listing"
  );

  assert.ok(intent);
  assert.equal(intent!.kind, "url");
  assert.ok(intent!.urls?.[0]?.includes("joongna.com"));
});

test("instagram noise does not become url intent", () => {
  const intent = classifyScreenshotText("instagram\n좋아요\n무료배송\nShare");
  assert.ok(intent);
  assert.notEqual(intent!.kind, "url");
});

test("place screenshot builds universal four-pillar actions", () => {
  const intent = classifyScreenshotText("강남역 맛집 우래옥\n서울 강남구");
  assert.ok(intent);
  assert.equal(intent!.kind, "place");

  const actions = buildScreenshotActions(intent!);
  assert.equal(actions.length, 4);
  assert.equal(actions[0]?.label, UNIVERSAL_PILLAR_LABEL.go);
  assert.ok(actions.some((action) => /tmap:|nmap:|map/i.test(action.href ?? "")));
  assert.ok(actions.some((action) => action.label === UNIVERSAL_PILLAR_LABEL.save));
  assert.ok(actions.some((action) => action.label === UNIVERSAL_PILLAR_LABEL.deep_dive));
});

test("product screenshot builds market compare actions", () => {
  const intent = classifyScreenshotText("아이폰 15 프로 256GB\n850,000원\n중고");
  assert.ok(intent);
  assert.equal(intent!.kind, "product");

  const actions = buildScreenshotActions(intent!);
  assert.ok(actions.some((action) => /알맞은 곳에서 비교/.test(action.label)));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
