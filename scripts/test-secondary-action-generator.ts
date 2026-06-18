#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  generateSecondaryActions,
  toSecondaryActionPublicJson,
} from "../lib/secondary-action-generator/generate-secondary-actions";

const airportMain = {
  main_action: {
    id: "main-taxi",
    label: "카카오T 호출",
    action_type: "TAXI",
    plugin: "kakao.taxi",
  },
  event: {
    title: "인천공항 출발",
    location: "인천공항",
    minutes_until_event: 45,
    intent: "travel",
  },
};

const secondaries = generateSecondaryActions(airportMain);
assert.ok(secondaries.length >= 1 && secondaries.length <= 3);
assert.ok(secondaries.every((item) => item.plugin));
assert.ok(secondaries.every((item) => item.confidence > 0 && item.confidence <= 1));
assert.ok(
  secondaries.every((item) => !/카카오T/u.test(item.label)),
  "must not repeat main action",
);

const reasons = new Set(secondaries.map((item) => item.reason));
assert.ok(
  reasons.has("risk") || reasons.has("convenience") || reasons.has("next_step"),
);

const json = toSecondaryActionPublicJson(secondaries);
assert.ok(json[0]?.label);
assert.ok(["next_step", "risk", "convenience"].includes(json[0]!.reason));

const dismissed = generateSecondaryActions({
  ...airportMain,
  user_history: { dismissed_labels: ["주차 등록"] },
});
assert.ok(!dismissed.some((item) => item.label === "주차 등록"));

console.log("test-secondary-action-generator: ok");
