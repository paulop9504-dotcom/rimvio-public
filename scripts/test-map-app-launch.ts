#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { defaultMapApp, orderedMapAppOptions } from "../lib/preferences/map-app";
import {
  buildMapAppHref,
  isMapLaunchAction,
  mapPrimaryLabel,
  resolveMapLaunchContext,
} from "../lib/resolvers/map-app-launch";
import { buildTrueCostReceipt } from "../lib/commerce/true-cost-receipt";
import { deriveCommerceVerdictPresentation } from "../lib/commerce/commerce-verdict-presentation";

assert.equal(defaultMapApp(true), "naver");
assert.equal(defaultMapApp(false), "google");
assert.equal(orderedMapAppOptions(true)[0]?.id, "naver");
assert.equal(orderedMapAppOptions(false)[0]?.id, "apple");

const travelLink = {
  original_url: "https://www.google.com/maps/place/Eiffel+Tower",
  title: "Eiffel Tower Paris",
  category: "travel",
};

const mapAction = {
  id: "map-1",
  kind: "open" as const,
  label: "Google 지도에서 열기",
  href: "https://www.google.com/maps/search/?api=1&query=Eiffel+Tower",
  payload: { icon: "map" as const },
};

assert.equal(isMapLaunchAction(mapAction, travelLink), true);

const context = resolveMapLaunchContext(travelLink, mapAction);
assert.equal(context.domestic, false);
assert.match(context.query, /Eiffel/i);
assert.equal(mapPrimaryLabel(context), "지도에서 열기");

assert.match(
  buildMapAppHref("google", context),
  /google\.com\/maps/
);
assert.match(
  buildMapAppHref("apple", context),
  /maps\.apple\.com/
);

const trueCost = buildTrueCostReceipt({
  title: "북미 아이패드 프로 m4",
  domain: "web.joongna.com",
  surfacePrice: 1_300_000,
});

const depreciation = deriveCommerceVerdictPresentation({ trueCost });
assert.equal(depreciation?.verdictHeadline, "보유 손실 예상");

console.log("test-map-app-launch: ok");
