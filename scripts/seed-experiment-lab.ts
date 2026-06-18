#!/usr/bin/env npx tsx
/**
 * Validate diverse travel-first experiment lab feed.
 * Usage: npm run seed:lab
 */

import assert from "node:assert/strict";
import { experimentLabLinks } from "../lib/demo/experiment-lab-links";
import { EXPERIMENT_LAB_VERSION } from "../lib/demo/reset-experiment-lab";
import { shouldShowTrueCostReceipt } from "../hooks/use-true-cost-receipt";

assert.ok(experimentLabLinks.length >= 40, "expected at least 40 lab links");
assert.match(EXPERIMENT_LAB_VERSION, /^v3-\d+/, "lab version should track feed count");
assert.ok(
  EXPERIMENT_LAB_VERSION.startsWith(`v3-${experimentLabLinks.length}`),
  "EXPERIMENT_LAB_VERSION must match link count for auto-refresh"
);

const naverCompareHrefs = experimentLabLinks.flatMap((link) =>
  (link.actions ?? [])
    .map((action) => action.href ?? "")
    .filter((href) => href.includes("search.shopping.naver.com"))
);
assert.equal(
  naverCompareHrefs.length,
  0,
  "lab compare chips must not open Naver Shopping web (IP block risk)"
);

const withThumb = experimentLabLinks.filter((link) => Boolean(link.thumbnail_url));
assert.equal(withThumb.length, experimentLabLinks.length, "every link needs a thumbnail");

const travel = experimentLabLinks.filter((link) => link.category === "travel");
assert.ok(travel.length >= 22, "expected 22+ travel links");

const uniqueThumbs = new Set(withThumb.map((link) => link.thumbnail_url));
assert.ok(uniqueThumbs.size >= 30, "expected 30+ unique photos");

const trueCostTargets = experimentLabLinks.filter((link) => shouldShowTrueCostReceipt(link));
assert.ok(trueCostTargets.length >= 4, "expected 4+ True Cost targets");

console.log(`✓ experiment lab feed: ${experimentLabLinks.length} links`);
console.log(`  Travel: ${travel.length} | Unique photos: ${uniqueThumbs.size}`);
console.log(`  True Cost targets: ${trueCostTargets.length}`);
console.log("\nOpen in browser: http://localhost:3000/?lab=fresh");
