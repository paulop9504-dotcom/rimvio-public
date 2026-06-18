#!/usr/bin/env npx tsx
/**
 * No-LLM commerce cleaner + market stats.
 * Usage: npm run test:commerce
 */

import assert from "node:assert/strict";
import {
  normalizeSecondhandTitle,
  passesSecondhandBlacklist,
} from "../lib/commerce/commerce-cleaner";
import { buildCompareQuery } from "../lib/commerce/compare-query";
import { jaccardSimilarity } from "../lib/commerce/text-similarity";
import { computeTruncatedMean } from "../lib/commerce/truncated-mean";
import { buildMarketPriceSnapshot } from "../lib/commerce/market-price";
import { buildTrueCostReceipt } from "../lib/commerce/true-cost-receipt";
import {
  detectTechDeviceKind,
  isTechListingTitle,
} from "../lib/commerce/tech-category";
import { parsePriceToWon } from "../lib/links/extract-price-hint";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`✓ ${name}`);
    })
    .catch((error) => {
      failed += 1;
      console.error(`✗ ${name}`);
      console.error(error);
    });
}

async function main() {
  await test("normalizeSecondhandTitle strips marketplace fluff", () => {
    const clean = normalizeSecondhandTitle(
      "[S급/급처] 아이폰 15 프로 256GB 풀박스 팝니다 850,000원"
    );
    assert.match(clean, /아이폰 15 프로 256GB/);
    assert.doesNotMatch(clean, /팝니다|급처|풀박/i);
  });

  await test("buildCompareQuery uses normalized title for bunjang", () => {
    const query = buildCompareQuery(
      "[급처] 갤럭시 S24 울트라 512GB 팝니다",
      "m.bunjang.co.kr"
    );
    assert.equal(query, "갤럭시 S24 울트라 512GB");
  });

  await test("blacklist rejects accessory listings", () => {
    assert.equal(passesSecondhandBlacklist("아이폰 15 프로 실리콘 케이스"), false);
    assert.equal(passesSecondhandBlacklist("아이폰 15 프로 256GB"), true);
  });

  await test("jaccard filters unrelated titles", () => {
    const score = jaccardSimilarity(
      "아이폰 15 프로 256GB",
      "아이폰 15 프로 실리콘 케이스"
    );
    assert.ok(score < 0.6);
  });

  await test("truncated mean trims outlier prices", () => {
    const stats = computeTruncatedMean([
      100,
      110,
      120,
      130,
      140,
      150,
      160,
      170,
      180,
      9_999_999,
    ]);

    assert.ok(stats.average !== null);
    assert.ok(stats.average! < 500_000);
    assert.equal(stats.count, 8);
  });

  await test("parsePriceToWon reads won suffix", () => {
    assert.equal(parsePriceToWon("아이폰 850,000원"), 850_000);
  });

  await test("market snapshot degrades gracefully without API keys", async () => {
    const snapshot = await buildMarketPriceSnapshot({
      title: "[급처] 아이폰 15 프로 256GB 850,000원",
      domain: "web.joongna.com",
    });

    assert.equal(snapshot.available, true);
    assert.notEqual(snapshot.verdict, "unknown");
    assert.ok(snapshot.median && snapshot.median > 0);
    assert.match(snapshot.headline, /시세|적정|%/);
    assert.match(snapshot.query, /아이폰 15 프로 256GB/);
    assert.equal(snapshot.listingPrice, 850_000);
  });

  await test("detects tech listing titles", () => {
    assert.ok(isTechListingTitle("[급처] 아이폰 15 프로 256GB 850,000원", "web.joongna.com"));
    assert.equal(detectTechDeviceKind("갤럭시 S24 울트라 512GB", "m.bunjang.co.kr"), "samsung_phone");
    assert.equal(isTechListingTitle("무선 이어폰 거치대"), false);
  });

  await test("buildTrueCostReceipt computes 6-month tech hold cost", () => {
    const receipt = buildTrueCostReceipt({
      title: "[S급] 아이폰 15 프로 256GB 800,000원",
      domain: "web.joongna.com",
    });

    assert.equal(receipt.available, true);
    assert.equal(receipt.surfacePrice, 800_000);
    assert.equal(receipt.depreciationAmount, 144_000);
    assert.equal(receipt.expectedResalePrice, 656_000);
    assert.equal(receipt.netHoldCost, 144_000);
    assert.equal(receipt.monthlyHoldCost, 24_000);
    assert.match(receipt.headline, /656,000원/);
  });

  await test("buildTrueCostReceipt uses explicit surfacePrice override", () => {
    const receipt = buildTrueCostReceipt({
      title: "북미 아이패드 프로 m4 13인치 256gb",
      domain: "web.joongna.com",
      surfacePrice: 1_300_000,
    });

    assert.equal(receipt.available, true);
    assert.equal(receipt.surfacePrice, 1_300_000);
    assert.equal(receipt.deviceKind, "apple_tablet");
    assert.equal(receipt.monthlyRate, 0.03);
    assert.equal(receipt.depreciationAmount, 234_000);
  });

  await test("legacy tech uses lower monthly depreciation", () => {
    const receipt = buildTrueCostReceipt({
      title: "아이폰 11 256GB 350,000원",
      domain: "m.bunjang.co.kr",
    });

    assert.equal(receipt.available, true);
    assert.equal(receipt.monthlyRate, 0.015);
    assert.equal(receipt.depreciationAmount, 31_500);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main();
