#!/usr/bin/env npx tsx
/**
 * Signal ledger + ConfidenceState + three-band transition.
 * Usage: npm run test:confidence-gate
 */

import assert from "node:assert/strict";
import {
  assessScreenshotConfidence,
  evaluateScreenshotGate,
  shouldRefineWithLlm,
} from "../lib/screenshot/confidence-gate";
import { collectScreenshotSignals, resolveScreenshotSignals } from "../lib/screenshot/collect-signals";
import { resolveConfidence } from "../lib/screenshot/resolve-confidence";
import { sumSignalLedger } from "../lib/screenshot/signal-ledger";
import {
  DETERMINISTIC_THRESHOLD,
  UNCERTAIN_THRESHOLD,
  finalizeBandAfterLlm,
  resolveConfidenceBand,
} from "../lib/screenshot/transition-gate";
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

test("signal ledger sums from base 50", () => {
  const score = sumSignalLedger([
    { id: "explicit_url", delta: 40 },
  ]);
  assert.equal(score, 90);
});

test("resolveConfidenceBand maps three bands on 0-100", () => {
  assert.equal(resolveConfidenceBand(DETERMINISTIC_THRESHOLD), "deterministic");
  assert.equal(resolveConfidenceBand(65), "assistive");
  assert.equal(resolveConfidenceBand(UNCERTAIN_THRESHOLD - 1), "uncertain");
});

test("url in OCR lands in deterministic band", () => {
  const result = assessScreenshotConfidence({
    rawText: "Check this https://web.joongna.com/product/12345",
  });

  assert.equal(result.band, "deterministic");
  assert.equal(result.state.policy.runLlm, false);
  assert.ok(result.score >= 90);
  assert.ok(result.state.signals.some((signal) => signal.id === "explicit_url"));
});

test("instagram noise lands in uncertain band", () => {
  const result = assessScreenshotConfidence({
    rawText:
      "instagram\n좋아요 1,204\n댓글 달기\nFollow\nShare\n무료배송\n나이키 덩크",
  });

  assert.equal(result.band, "uncertain");
  assert.equal(result.state.policy.runLlm, true);
  assert.equal(result.state.policy.needsConfirm, true);
  assert.ok(result.score < UNCERTAIN_THRESHOLD);
});

test("strong cafe place lands in deterministic band", () => {
  const result = assessScreenshotConfidence({
    rawText: "성수동 카페 온더룩\n서울 성동구 연무장17길 4",
  });

  assert.equal(result.band, "deterministic");
  assert.equal(result.state.policy.runLlm, false);
  assert.ok(result.score >= DETERMINISTIC_THRESHOLD);
});

test("instagram noise does not become url intent", () => {
  const intent = classifyScreenshotText("instagram\n좋아요\n무료배송\nShare");
  assert.ok(intent);
  assert.notEqual(intent!.kind, "url");
});

test("fluff-only product query lands in uncertain band", () => {
  const result = assessScreenshotConfidence({
    rawText: "instagram\n좋아요\n무료배송\nShare",
  });

  assert.equal(result.band, "uncertain");
  assert.equal(result.state.policy.needsConfirm, true);
  assert.ok(result.state.signals.some((signal) => signal.id === "fluff_query"));
});

test("LLM refinement boosts score via signal ledger", () => {
  const pre = resolveScreenshotSignals({
    rawText: "instagram\n좋아요\n무료배송\n나이키 덩크",
  });
  const post = resolveScreenshotSignals({
    rawText: "instagram\n좋아요\n무료배송\n나이키 덩크",
    llmRefinement: {
      source: "llm",
      kind: "product",
      query: "나이키 덩크",
    },
  });

  assert.ok(post.score > pre.score);
  assert.ok(post.signals.some((signal) => signal.id === "llm_refined"));
});

test("evaluateScreenshotGate returns ConfidenceState", () => {
  const gate = evaluateScreenshotGate({
    rawText: "Sony WH-1000XM5\nNoise cancelling headphones\n₩429,000",
  });

  assert.equal(gate.state.band, "deterministic");
  assert.ok(gate.state.score >= DETERMINISTIC_THRESHOLD);
  assert.equal(typeof gate.state.policy.canAutoCommit, "boolean");
});

test("finalizeBandAfterLlm demotes assistive failure to uncertain", () => {
  assert.equal(
    finalizeBandAfterLlm({
      preBand: "assistive",
      postScore: 62,
      llmSucceeded: false,
    }),
    "uncertain"
  );
});

test("finalizeBandAfterLlm promotes assistive LLM success to deterministic", () => {
  assert.equal(
    finalizeBandAfterLlm({
      preBand: "assistive",
      postScore: 88,
      llmSucceeded: true,
    }),
    "deterministic"
  );
});

test("shouldRefineWithLlm follows policy not legacy boolean", () => {
  const high = assessScreenshotConfidence({
    rawText: "Sony WH-1000XM5\nNoise cancelling headphones\n₩429,000",
  });

  assert.equal(shouldRefineWithLlm(high), false);
  assert.equal(high.state.band, "deterministic");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
