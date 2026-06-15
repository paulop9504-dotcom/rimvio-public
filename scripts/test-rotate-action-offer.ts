#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  isUserConfirmingActions,
  isUserRequestingAlternate,
} from "../lib/action-chat/action-confidence";
import {
  applyAlternateActionOffer,
  rotateActionOffer,
} from "../lib/action-chat/rotate-action-offer";
import { createOpenAction } from "../lib/enrichers/action-factory";

const actions = [
  createOpenAction({ label: "연락하기 (042-544-1162)", href: "tel:0425441162", icon: "phone", payload: { dialPrep: true } }),
  createOpenAction({ label: "네비게이션", href: "tmap://search?name=test", icon: "map" }),
  createOpenAction({ label: "홈페이지", href: "https://example.com", icon: "globe" }),
];

const rotated = rotateActionOffer(actions);
assert.equal(rotated[0]?.label, "네비게이션");
assert.equal(rotated[0]?.payload?.domainPrimary, true);
assert.equal(rotated[2]?.label, "연락하기 (042-544-1162)");

const alternate = applyAlternateActionOffer({ actions });
assert.match(alternate.summary ?? "", /네비게이션/);

assert.ok(isUserRequestingAlternate("아니요, 다른 거 보여주세요"));
assert.ok(isUserRequestingAlternate("다른거 보여줘"));
assert.equal(isUserConfirmingActions("아니요, 다른 거 보여주세요"), false);
assert.ok(isUserConfirmingActions("네 보여주세요"));

console.log("test-rotate-action-offer: ok");
