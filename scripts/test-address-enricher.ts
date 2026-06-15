#!/usr/bin/env npx tsx
/**
 * Address / road-name URL enricher (dorojuso.kr, juso.go.kr).
 * Usage: npm run test:address
 */

import assert from "node:assert/strict";
import { enrichUrl } from "../lib/enrichers/registry";
import { isAddressUrl } from "../lib/enrichers/address";
import {
  cleanAddressTitle,
  parseAddressTitleFromUrl,
} from "../lib/enrichers/url-intelligence";
import { routeLink } from "../lib/routing/intelligent-router";

const DOROJUSO_URL =
  "https://dorojuso.kr/3020010600107220000000007/%EB%8C%80%EC%A0%84%EA%B4%91%EC%97%AD%EC%8B%9C-%EC%9C%A0%EC%84%B1%EA%B5%AC-%ED%95%99%ED%95%98%EC%A4%91%EC%95%99%EB%A1%9C-99-%EA%B3%84%EC%82%B0%EB%8F%99-%EC%98%A4%ED%88%AC%EA%B7%B8%EB%9E%80%EB%8D%B0%EB%A6%AC%EB%B9%99%ED%8F%AC%EB%A0%88%EC%95%84%ED%8C%8C%ED%8A%B8";

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
  await test("dorojuso URL is detected as address", () => {
    assert.ok(isAddressUrl(DOROJUSO_URL));
  });

  await test("parseAddressTitleFromUrl extracts road address slug", () => {
    const title = parseAddressTitleFromUrl(DOROJUSO_URL);
    assert.ok(title);
    assert.match(title, /대전광역시/);
    assert.match(title, /학하중앙로/);
  });

  await test("cleanAddressTitle strips 도로명주소 suffix", () => {
    const cleaned = cleanAddressTitle(
      "대전광역시 유성구 학하중앙로 99 - 도로명주소"
    );
    assert.equal(cleaned, "대전광역시 유성구 학하중앙로 99");
  });

  await test("dorojuso routes to travel map_navigate", () => {
    const result = routeLink({
      url: DOROJUSO_URL,
      domain: "dorojuso.kr",
      title: "대전광역시 유성구 학하중앙로 99",
    });

    assert.equal(result.winner, "travel");
    assert.equal(result.mode, "map_navigate");
    assert.ok(result.confidence >= 0.5);
  });

  await test("dorojuso enricher yields map navigation actions", async () => {
    const enriched = await enrichUrl(DOROJUSO_URL);
    assert.equal(enriched.enricher_id, "address-v1");
    assert.ok(enriched.actions.length >= 3);

    const labels = enriched.actions.map((action) => action.label).join(" ");
    assert.match(labels, /네이버지도|카카오|길찾기/i);
    assert.ok(
      enriched.actions.some((action) => action.kind === "open" && action.href),
      "expected at least one open action"
    );
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main();
