#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { extractPlaceEntities } from "../lib/action-chat/clean-entity-text";
import { buildExtractedDataFromText } from "../lib/action-chat/confirmation-logic";
import { buildActionsFromConfirmationData } from "../lib/action-chat/build-confirmation-actions";
import { resolveNavigationPlaceName } from "../lib/action-chat/resolve-navigation-place";
import { buildScheduledPlaceNavActions } from "../lib/action-chat/scheduled-action-delivery";

const message = "3분뒤 수서역 가야됨";

assert.equal(resolveNavigationPlaceName(message), "수서역");

assert.equal(resolveNavigationPlaceName("대전 치킨 맛집 추천"), null);

const entity = extractPlaceEntities(message);
assert.equal(entity.name, "수서역");

const extracted = buildExtractedDataFromText(message, "2026-05-29");
assert.equal(extracted.place_name, "수서역");

const actions = buildActionsFromConfirmationData(extracted, message);
assert.ok(actions.length >= 1);
const nav = actions.find((action) => /네비/i.test(action.label));
assert.ok(nav);
assert.equal(nav!.payload?.copyText, "수서역");
assert.equal(nav!.payload?.navPlaceName, "수서역");

const scheduled = buildScheduledPlaceNavActions(extracted, message);
assert.ok(scheduled.some((action) => /네비/i.test(action.label)));
assert.equal(
  scheduled.find((a) => /네비/i.test(a.label))!.payload?.copyText,
  "수서역"
);

console.log("test-resolve-navigation-place: ok");
