#!/usr/bin/env npx tsx
/**
 * Market Pack — locale-aware compare destination routing.
 * Usage: npm run test:market-packs
 */

import assert from "node:assert/strict";
import { buildMarketCompareActions } from "../lib/markets/build-compare-actions";
import { resolveCompareDestinations } from "../lib/markets/resolve-compare-destinations";
import { applyRoutingToActions, buildFallbackModeActions } from "../lib/routing/apply-routing";
import { routeLink } from "../lib/routing/intelligent-router";

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

test("joongna tech listing routes to bunjang first and skips joongna", () => {
  const plan = resolveCompareDestinations({
    title: "아이폰 15 프로 256GB 중고",
    domain: "web.joongna.com",
    sourceUrl: "https://web.joongna.com/product/12345",
    locale: "ko",
  });

  assert.ok(plan);
  assert.equal(plan!.market, "kr");
  assert.equal(plan!.lane, "tech_secondhand");
  assert.equal(plan!.destinations[0]?.id, "bunjang");
  assert.ok(!plan!.destinations.some((dest) => dest.id === "joongna"));
});

test("bunjang listing skips bunjang and keeps local KR destinations", () => {
  const plan = resolveCompareDestinations({
    title: "맥북 에어 M2",
    domain: "m.bunjang.co.kr",
    sourceUrl: "https://m.bunjang.co.kr/products/999",
    locale: "ko",
  });

  assert.ok(plan);
  assert.equal(plan!.destinations[0]?.id, "joongna");
  assert.ok(!plan!.destinations.some((dest) => dest.id === "bunjang"));
});

test("mercari JP listing prefers kakaku/rakuma over mercari", () => {
  const plan = resolveCompareDestinations({
    title: "Nintendo Switch 有機EL",
    domain: "jp.mercari.com",
    sourceUrl: "https://jp.mercari.com/item/m123",
    locale: "ja",
  });

  assert.ok(plan);
  assert.equal(plan!.market, "jp");
  assert.equal(plan!.lane, "tech_secondhand");
  assert.ok(!plan!.destinations.some((dest) => dest.id === "mercari"));
  assert.equal(plan!.destinations[0]?.id, "rakuma");
});

test("amazon US product uses US new-goods pack", () => {
  const plan = resolveCompareDestinations({
    title: "Sony WH-1000XM5",
    domain: "www.amazon.com",
    sourceUrl: "https://www.amazon.com/dp/B09XYZ",
    locale: "en",
  });

  assert.ok(plan);
  assert.equal(plan!.market, "us");
  assert.equal(plan!.lane, "tech_new");
  assert.equal(plan!.destinations[0]?.id, "bestbuy");
});

test("travel sunset screenshot never routes to Amazon compare", () => {
  const plan = resolveCompareDestinations({
    title: "산토리니 오ía 일몰",
    domain: "rimvio.app",
    sourceUrl: "https://rimvio.app/capture/lab-santorini",
    locale: "ko",
    category: "travel",
    source_type: "screenshot",
  });

  assert.equal(plan, null);

  const actions = buildMarketCompareActions({
    sourceUrl: "https://rimvio.app/capture/lab-santorini",
    domain: "rimvio.app",
    title: "산토리니 오ía 일몰",
    appLocale: "ko",
    linkCategory: "travel",
    sourceType: "screenshot",
  });

  assert.equal(actions.length, 0);

  const fallback = buildFallbackModeActions({
    sourceUrl: "https://rimvio.app/capture/lab-santorini",
    domain: "rimvio.app",
    title: "산토리니 오ía 일몰",
    linkCategory: "travel",
    sourceType: "screenshot",
  });

  assert.ok(fallback.some((action) => /지도/.test(action.label)));
  assert.ok(
    !fallback.some((action) => /amazon\.com/i.test(action.href ?? "")),
    "travel fallback must not open Amazon"
  );
});

test("buildMarketCompareActions returns primary + secondary chips", () => {
  const actions = buildMarketCompareActions({
    sourceUrl: "https://web.joongna.com/product/12345",
    domain: "web.joongna.com",
    title: "갤럭시 S24 울트라 512GB",
    appLocale: "ko",
  });

  assert.ok(actions.length >= 2);
  assert.match(actions[0]!.label, /알맞은 곳에서 비교/);
  assert.match(actions[0]!.href ?? "", /bunjang/i);
  assert.ok(actions.some((action) => /당근|다나와/.test(action.label)));
});

test("applyRoutingToActions injects market compare for commerce_compare", () => {
  const routing = routeLink({
    url: "https://web.joongna.com/product/12345",
    domain: "web.joongna.com",
    title: "아이폰 15 프로 중고 판매",
  });

  const next = applyRoutingToActions(
    [
      {
        id: "primary",
        kind: "open",
        label: "원본 열기",
        href: "https://web.joongna.com/product/12345",
      },
    ],
    {
      sourceUrl: "https://web.joongna.com/product/12345",
      domain: "web.joongna.com",
      title: "아이폰 15 프로 중고 판매",
      appLocale: "ko",
    },
    routing
  );

  assert.ok(next.some((action) => /알맞은 곳에서 비교/.test(action.label)));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
