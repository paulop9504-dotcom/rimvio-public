#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildMarketPriceSnapshot } from "../lib/commerce/market-price";
import { buildTrueCostReceipt } from "../lib/commerce/true-cost-receipt";
import { buildUnifiedCommerceReceipt } from "../lib/commerce/unified-commerce-receipt";

async function main() {
  const trueCost = buildTrueCostReceipt({
    title: "북미 아이패드 프로 m4 13인치 256gb",
    domain: "web.joongna.com",
    surfacePrice: 1_300_000,
  });

  const market = await buildMarketPriceSnapshot({
    title: "북미 아이패드 프로 m4 13인치 256gb 1,300,000원",
    domain: "web.joongna.com",
  });

  const unified = buildUnifiedCommerceReceipt({ market, trueCost });

  assert.equal(unified.available, true);
  assert.ok(unified.verdict);
  assert.notEqual(unified.verdict?.kind, "pending");
  assert.notEqual(unified.verdict?.stampLabel, "PENDING");
  assert.ok(
    /손실\(감가\) 예상|시세 대비|실시간 시세 지연/.test(unified.verdict?.subline ?? "")
  );
  assert.equal(unified.badge, "Apple · iPad");
  assert.ok(unified.lines.some((line) => line.label.includes("감가")));
  assert.ok(unified.lines.some((line) => line.label.includes("월 사용료")));
  assert.equal(unified.lines.filter((line) => line.label === "매물가").length, 0);
  assert.ok(unified.lines.length <= 5, "essential lines only");

  console.log("test-unified-commerce-receipt: ok");
}

void main();
