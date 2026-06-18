#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildMarketPriceSnapshot } from "../lib/commerce/market-price";

async function main() {
  const snapshot = await buildMarketPriceSnapshot({
    title: "Galaxy S24 Ultra 256GB 1,350,000원",
    domain: "coupang.com",
    listingPriceText: "1,350,000원",
  });

  assert.equal(snapshot.available, true);
  assert.equal(snapshot.listingPrice, 1350000);
  assert.notEqual(snapshot.verdict, "unknown");
  assert.ok(snapshot.median && snapshot.median > 0);
  assert.match(snapshot.headline, /시세|적정|%/);

  const swPath = path.join(process.cwd(), "public", "sw.js");
  assert.ok(fs.existsSync(swPath), "service worker exists");

  console.log("test-launch-prep: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
