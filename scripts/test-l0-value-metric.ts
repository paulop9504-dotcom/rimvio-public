#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  shoppingLossPreventionMetric,
  studyLossPreventionMetric,
} from "../lib/routing/l0-value-metric";
import { routeRimvioL0 } from "../lib/routing/rimvio-l0-orchestrator";

assert.match(
  studyLossPreventionMetric(
    "The Changing View of God. ".repeat(40) +
      "Quantum consciousness and measurement theory in academic literature."
  ),
  /이 요약으로 아낀 시간: 약 \d+분/
);

assert.equal(
  shoppingLossPreventionMetric(
    "북미 아이패드 프로 m4 13인치 256gb",
    "web.joongna.com",
    1_320_000,
    { listingPrice: 1_320_000, medianPrice: 1_300_000, verdict: "high" }
  ),
  "시세 대비 2만 원 비쌈 — 안 사는 게 이득입니다."
);

assert.match(
  shoppingLossPreventionMetric(
    "북미 아이패드 프로 m4 13인치 256gb 1,300,000원",
    "web.joongna.com",
    1_300_000
  ),
  /손실\(감가\) 예상/
);

const ipad = routeRimvioL0({
  kind: "link",
  url: "https://web.joongna.com/product/123",
  domain: "web.joongna.com",
  title: "북미 아이패드 프로 m4 13인치 256gb 1,300,000원",
  category: "shopping",
  source_type: "commerce",
});
assert.match(ipad.value_metric, /손실\(감가\)|손해/);

console.log("test-l0-value-metric: ok");
