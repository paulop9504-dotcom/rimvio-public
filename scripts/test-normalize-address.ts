#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { normalizeAddressPair } from "../lib/action-chat/normalize-address";
import { buildTmapNavigateHref } from "../lib/actions/domain-deep-links";
import { extractPlaceEntities } from "../lib/action-chat/entity-action-architect";

const cases = [
  {
    input: "도안동로 10 4층",
    nav: "도안동로 10",
  },
  {
    input: "중앙로 100, 102호",
    nav: "중앙로 100",
  },
  {
    input: "테헤란로 123, 지하 1층",
    nav: "테헤란로 123",
  },
  {
    input: "대전 서구 도안동로 10 4층",
    nav: "대전 서구 도안동로 10",
  },
];

for (const sample of cases) {
  const pair = normalizeAddressPair(sample.input);
  assert.ok(pair);
  assert.equal(pair!.display, sample.input);
  assert.equal(pair!.nav, sample.nav, sample.input);
}

const tmap = buildTmapNavigateHref("쿠우쿠우", "대전 서구 도안동로 10");
assert.match(tmap, /name=.*%EC%BF%A0%EC%9A%B0/);
assert.match(tmap, /address=.*%EB%8C%80%EC%A0%84/);

const qooqoo = extractPlaceEntities("대전 서구 도안동로 10 4층");
assert.equal(qooqoo.address?.display, "대전 서구 도안동로 10 4층");
assert.equal(qooqoo.address?.nav, "대전 서구 도안동로 10");

console.log("test-normalize-address: ok");
