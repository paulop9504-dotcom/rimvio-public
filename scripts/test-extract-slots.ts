#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { extractSlots } from "../lib/event-kernel/slot-filling/extract-slots";
import { validateActionContract } from "../lib/event-kernel/action-contracts/validate-action-contract";

assert.deepEqual(extractSlots("인천공항 가는 길").slots, {
  destination: "인천공항",
});

assert.deepEqual(extractSlots("삼성전자 가격").slots, {
  entity: "삼성전자",
});

assert.deepEqual(extractSlots("오늘 대전 날씨").slots, {
  location: "대전",
});

assert.deepEqual(extractSlots("").slots, {});

const navigateValid = validateActionContract({
  action: "NAVIGATE",
  extractedSlots: extractSlots("인천공항 가는 길").slots,
});
assert.equal(navigateValid.valid, true);

const priceValid = validateActionContract({
  action: "PRICE_LOOKUP",
  extractedSlots: extractSlots("삼성전자 가격").slots,
});
assert.equal(priceValid.valid, true);

const weatherValid = validateActionContract({
  action: "WEATHER",
  extractedSlots: extractSlots("오늘 대전 날씨").slots,
});
assert.equal(weatherValid.valid, true);

console.log("test-extract-slots: ok");
