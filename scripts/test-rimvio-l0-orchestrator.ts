#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { routeRimvioL0 } from "../lib/routing/rimvio-l0-orchestrator";

const physicsBook = [
  "Physics of the Soul",
  "47",
  "The Changing View of God",
  "We call this the quantum self, the subject that has complete freedom of choice in the process of quantum measurement.",
  "God is not a king on a throne but the Creative Principle within science and consciousness.",
].join("\n");

const study = routeRimvioL0({ kind: "capture", text: physicsBook });
assert.equal(study.domain, "STUDY");
assert.equal(study.engine_route, "document_study");
assert.equal(study.capture_kind, "document_study");
assert.equal(study.secondary_domain, null);

const medicine = routeRimvioL0({
  kind: "capture",
  text: "Tylenol 500mg\n복용법: 1정 8시간마다\n주의: 간 질환자 상담",
});
assert.equal(medicine.domain, "MEDICAL");
assert.equal(medicine.engine_route, "medicine");
assert.equal(medicine.capture_kind, "medicine");

const philosophyMedicine = routeRimvioL0({
  kind: "capture",
  text: [
    "Philosophy of Medicine",
    "Chapter 3",
    "The concept of healing involves 500mg metaphors in historical texts about dosage ethics in academic literature.",
    "Students should compare Mitchell (1992) with contemporary bioethics essays on patient narratives.",
  ].join("\n"),
});
assert.equal(philosophyMedicine.domain, "STUDY");

const ipad = routeRimvioL0({
  kind: "link",
  url: "https://web.joongna.com/product/123",
  domain: "web.joongna.com",
  title: "북미 아이패드 프로 m4 13인치 256gb 1,300,000원",
  category: "shopping",
  source_type: "commerce",
});
assert.equal(ipad.domain, "SHOPPING");
assert.equal(ipad.secondary_domain, "FINANCE");
assert.equal(ipad.engine_route, "true-cost");
assert.equal(ipad.capture_kind, null);
assert.match(ipad.value_metric, /손실\(감가\)|손해/);

const receipt = routeRimvioL0({
  kind: "capture",
  text: "스타벅스 강남점\n합계 5,500원\n승인 1234\n영수증",
});
assert.equal(receipt.domain, "FINANCE");
assert.equal(receipt.engine_route, "receipt");
assert.equal(receipt.capture_kind, "receipt");

const menu = routeRimvioL0({
  kind: "capture",
  text: "카페 브런치\n아메리카노 4,500원\n라떼 5,000원\n메뉴",
});
assert.equal(menu.domain, "FOOD");
assert.equal(menu.engine_route, "food_vision");

assert.ok(study.confidence >= 0.7);
assert.doesNotThrow(() => JSON.parse(JSON.stringify(study)));

console.log("test-rimvio-l0-orchestrator: ok");
