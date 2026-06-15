#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { buildMarketPriceSnapshot } from "../lib/commerce/market-price";
import { estimateMedianFromTrueCost } from "../lib/commerce/market-estimate-fallback";
import { deriveCommerceVerdictPresentation } from "../lib/commerce/commerce-verdict-presentation";
import { marketSnapshotToL0Context } from "../lib/commerce/l0-market-context";
import { parseBunjangFindResponse } from "../lib/commerce/sources/bunjang-search";
import { parseNaverShoppingWebPrices } from "../lib/commerce/sources/naver-shopping-web";

async function main() {
  assert.ok(
    parseBunjangFindResponse({
      list: [
        { name: "아이패드 프로 M4 256GB", price: "1250000", pid: 123 },
        { name: "아이패드 프로 M4 512GB", price: "1450000", pid: 124 },
      ],
    }).length >= 2
  );

  assert.ok(
    parseNaverShoppingWebPrices(
      '{"productName":"아이패드","lowPrice":"1280000"}'
    ).length >= 1
  );

  const techEstimate = estimateMedianFromTrueCost({
    title: "북미 아이패드 프로 m4 13인치 256gb 1,300,000원",
    domain: "web.joongna.com",
    listingPrice: 1_300_000,
  });

  assert.ok(techEstimate);
  assert.ok(techEstimate!.median > 0);

  const snapshot = await buildMarketPriceSnapshot({
    title: "[급처] 아이폰 15 프로 256GB 850,000원",
    domain: "web.joongna.com",
  });

  assert.equal(snapshot.available, true);
  assert.notEqual(snapshot.verdict, "unknown");
  assert.ok(snapshot.median && snapshot.median > 0);
  assert.ok(
    ["web_scrape", "true_cost_model", "estimate_band", "api"].includes(
      snapshot.estimateKind
    )
  );

  const presentation = deriveCommerceVerdictPresentation({
    market: snapshot,
    trueCost: null,
  });

assert.notEqual(presentation?.kind, "pending");
assert.notEqual(presentation?.stampLabel, "PENDING");
assert.match(presentation?.stampLabel ?? "", /^(EST\.\s)?(PASS|CHECK|HOLD)/);

  const l0Context = marketSnapshotToL0Context(snapshot);
  assert.equal(l0Context?.listingPrice, 850_000);
  assert.ok(l0Context?.medianPrice);

  console.log("test-market-fallback: ok");
}

void main();
