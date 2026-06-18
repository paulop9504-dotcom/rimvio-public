#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { tryPlaceConfirmation } from "../lib/action-chat/confirmation-logic";
import { enrichPlaceDiscoveryMessage } from "../lib/context-resolver/discovery/enrich-place-discovery-message";
import {
  isPlaceRecommendationQuery,
  parseFindPlaceIntent,
} from "../lib/context-resolver/discovery/parse-find-place-intent";
import { resolveNavigationPlaceName } from "../lib/action-chat/resolve-navigation-place";

assert.equal(enrichPlaceDiscoveryMessage("쿠우쿠우"), "쿠우쿠우 맛집 추천");
assert.ok(isPlaceRecommendationQuery("맛집 검색좀"));
assert.equal(
  enrichPlaceDiscoveryMessage("맛집 검색좀", [
    { role: "user", content: "쿠우쿠우" },
  ]),
  "쿠우쿠우 맛집 추천"
);
assert.equal(resolveNavigationPlaceName("맛집 검색좀"), null);
assert.equal(tryPlaceConfirmation({ message: "맛집 검색좀" }), null);
assert.equal(tryPlaceConfirmation({ message: "쿠우쿠우" }), null);
assert.ok(parseFindPlaceIntent("맛집 검색좀"));
assert.ok(parseFindPlaceIntent("둔산동 맛집"));
assert.equal(parseFindPlaceIntent("둔산동 맛집")!.anchor, "둔산동");

console.log("test-place-discovery-enrich: ok");
