#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { tryPlaceConfirmation } from "../lib/action-chat/confirmation-logic";
import {
  buildEntityQuickPickWire,
  isBareBrandUtterance,
  orchestrateEntityQuickPick,
} from "../lib/context-resolver/discovery/orchestrate-entity-quick-pick";
import { derivePresentationWire } from "../lib/presentation/presentation-mode";

assert.ok(isBareBrandUtterance("쿠우쿠우"));
assert.ok(isBareBrandUtterance("삼성전자"));
assert.equal(isBareBrandUtterance("맛집 검색좀"), false);
assert.equal(isBareBrandUtterance("둔산동 갤러리아"), false);

const wire = buildEntityQuickPickWire("쿠우쿠우");
assert.match(wire.lead, /쿠우쿠우.*(?:자주|많이)/);
assert.ok(wire.options.length >= 4);
assert.deepEqual(
  wire.options.map((o) => o.label),
  ["가격", "매장 찾기", "영업시간", "예약", "메뉴"]
);
assert.equal(wire.options[1]?.prompt, "쿠우쿠우 맛집 추천");

const result = orchestrateEntityQuickPick("쿠우쿠우");
assert.ok(result);
assert.equal(result!.presentation?.mode, "ENTITY_QUICK_PICK");
assert.equal(tryPlaceConfirmation({ message: "쿠우쿠우" }), null);

assert.equal(
  derivePresentationWire({ entityQuickPick: wire }).mode,
  "ENTITY_QUICK_PICK"
);

console.log("test-entity-quick-pick: ok");
