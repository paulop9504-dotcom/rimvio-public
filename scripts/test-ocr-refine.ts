#!/usr/bin/env npx tsx
/**
 * LLM OCR refinement parsing + intent merge.
 * Usage: npm run test:ocr-refine
 */

import assert from "node:assert/strict";
import { applyOcrRefinement } from "../lib/screenshot/resolve-screenshot-intent";
import {
  parseOcrRefinementContent,
  prefilterOcrForLlm,
} from "../lib/screenshot/refine-ocr-llm";
import { assessScreenshotConfidence } from "../lib/screenshot/confidence-gate";
import { FROZEN_SHARE_TARGET_ACTION } from "../lib/share/share-target-config";

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

test("prefilterOcrForLlm strips instagram UI noise", () => {
  const filtered = prefilterOcrForLlm(
    "instagram\n좋아요 1,204\n댓글 달기\n나이키 �unk 로우 팬더\n무료배송"
  );

  assert.doesNotMatch(filtered, /instagram|좋아요|댓글/i);
  assert.match(filtered, /나이키|�unk|팬더/i);
});

test("parseOcrRefinementContent reads JSON product query", () => {
  const parsed = parseOcrRefinementContent(
    '{"kind":"product","query":"나이키 덩크 로우 팬더"}'
  );

  assert.ok(parsed);
  assert.equal(parsed!.source, "llm");
  assert.equal(parsed!.kind, "product");
  assert.match(parsed!.query!, /나이키/);
});

test("applyOcrRefinement overrides noisy regex query with LLM query", () => {
  const intent = applyOcrRefinement(
    {
      kind: "product",
      query: "무료배송",
      ocrText: "instagram noise",
    },
    {
      source: "llm",
      kind: "product",
      query: "나이키 덩크 로우 팬더",
    }
  );

  assert.equal(intent.query, "나이키 덩크 로우 팬더");
});

test("assessScreenshotConfidence lands strong product in deterministic band", () => {
  const gate = assessScreenshotConfidence({
    rawText: "Sony WH-1000XM5\nNoise cancelling headphones\n₩429,000",
  });

  assert.equal(gate.band, "deterministic");
  assert.equal(gate.state.policy.runLlm, false);
  assert.ok(gate.score >= 80);
});

test("share target action stays frozen at /share", () => {
  assert.equal(FROZEN_SHARE_TARGET_ACTION, "/share");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
