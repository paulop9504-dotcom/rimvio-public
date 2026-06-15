#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  ACTION_CONTRACT_REGISTRY,
  getActionContract,
  listActionContracts,
  requiredSlotsForAction,
} from "../lib/event-kernel/action-contracts/action-contract-registry";

const navigate = getActionContract("NAVIGATE");
assert.deepEqual(navigate, {
  action: "NAVIGATE",
  requiredSlots: ["destination"],
});

const price = getActionContract("PRICE_LOOKUP");
assert.deepEqual(price, {
  action: "PRICE_LOOKUP",
  requiredSlots: ["entity"],
});

const weather = getActionContract("WEATHER");
assert.deepEqual(weather, {
  action: "WEATHER",
  requiredSlots: ["location"],
});

assert.deepEqual(getActionContract("MEAL_RECOMMENDATION"), {
  action: "MEAL_RECOMMENDATION",
  requiredSlots: [],
});

assert.deepEqual(getActionContract("SCHEDULE_ORGANIZE"), {
  action: "SCHEDULE_ORGANIZE",
  requiredSlots: [],
});

assert.equal(getActionContract("UNKNOWN_ACTION"), null);
assert.deepEqual(requiredSlotsForAction("UNKNOWN_ACTION"), []);

assert.equal(listActionContracts().length, 6);
assert.ok(ACTION_CONTRACT_REGISTRY.NAVIGATE);

console.log("test-action-contract-registry: ok");
