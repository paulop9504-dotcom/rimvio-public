#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { validateActionContract } from "../lib/event-kernel/action-contracts/validate-action-contract";

assert.deepEqual(
  validateActionContract({ action: "NAVIGATE", extractedSlots: {} }),
  { valid: false, missingSlots: ["destination"] }
);

assert.deepEqual(
  validateActionContract({
    action: "NAVIGATE",
    extractedSlots: { destination: "인천공항" },
  }),
  { valid: true, missingSlots: [] }
);

assert.deepEqual(
  validateActionContract({
    action: "NAVIGATE",
    extractedSlots: { destination: "   " },
  }),
  { valid: false, missingSlots: ["destination"] }
);

assert.deepEqual(
  validateActionContract({ action: "PRICE_LOOKUP", extractedSlots: {} }),
  { valid: false, missingSlots: ["entity"] }
);

assert.deepEqual(
  validateActionContract({
    action: "MEAL_RECOMMENDATION",
    extractedSlots: {},
  }),
  { valid: true, missingSlots: [] }
);

assert.deepEqual(
  validateActionContract({ action: "UNKNOWN", extractedSlots: {} }),
  { valid: false, missingSlots: [] }
);

console.log("test-validate-action-contract: ok");
