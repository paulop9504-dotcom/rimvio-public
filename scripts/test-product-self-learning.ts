#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { decayMultiplier } from "../lib/product-self-learning/apply-decay";
import { aggregateProductSignals } from "../lib/product-self-learning/compute-reward";
import { runProductSelfLearningLoop } from "../lib/product-self-learning/run-product-learning-loop";

const now = new Date("2026-06-02T12:00:00.000Z");
const recent = "2026-06-02T11:00:00.000Z";
const old = "2026-05-20T11:00:00.000Z";

assert.ok(decayMultiplier(recent, now) > decayMultiplier(old, now));

const aggregates = aggregateProductSignals({
  impression_log: [
    { product_id: "p-a", timestamp: recent, kind: "impression" },
    { product_id: "p-b", timestamp: recent, kind: "impression" },
  ],
  click_log: [{ product_id: "p-a", timestamp: recent, kind: "click" }],
  dwell_time: [{ product_id: "p-a", timestamp: recent, dwell_ms: 12_000 }],
  conversion_log: [{ product_id: "p-a", timestamp: recent, kind: "conversion" }],
  now,
});

const pA = aggregates.get("p-a");
assert.ok(pA);
assert.ok(pA!.reward > 0);
assert.equal(pA!.clicks, 1);
assert.equal(pA!.conversions, 1);

const pB = aggregates.get("p-b");
assert.ok(pB);
assert.ok(pB!.reward < 0, "no-click impression should be negative overall");

const result = runProductSelfLearningLoop({
  impression_log: [
    { product_id: "p-a", timestamp: recent, kind: "impression" },
    { product_id: "p-b", timestamp: recent, kind: "impression" },
    { product_id: "p-b", timestamp: recent, kind: "impression" },
    { product_id: "p-b", timestamp: recent, kind: "impression" },
  ],
  click_log: [{ product_id: "p-a", timestamp: recent, kind: "click" }],
  dwell_time: [{ product_id: "p-a", timestamp: recent, dwell_ms: 12_000 }],
  conversion_log: [{ product_id: "p-a", timestamp: recent, kind: "conversion" }],
  current_weights: { "p-a": 0.5, "p-b": 0.5 },
  learning_rate: 0.12,
  drop_threshold: 0.2,
  min_impressions_to_drop: 3,
  now: now.toISOString(),
});

assert.ok(result.updated_product_weights["p-a"] > 0.5);
assert.ok(result.emerging_products.includes("p-a"));
assert.ok(result.dropped_products.includes("p-b"));
assert.equal(result.system_bias_shift, "conversion-heavy");

console.log("test-product-self-learning: ok");
