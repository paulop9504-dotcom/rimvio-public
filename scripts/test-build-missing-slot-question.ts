#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildMissingSlotQuestion } from "../lib/event-kernel/slot-filling/build-missing-slot-question";
import { validateActionContract } from "../lib/event-kernel/action-contracts/validate-action-contract";

assert.equal(
  buildMissingSlotQuestion({ action: "NAVIGATE", missingSlots: ["destination"] }),
  "어디로 가시나요?"
);

assert.equal(
  buildMissingSlotQuestion({ action: "PRICE_LOOKUP", missingSlots: ["entity"] }),
  "무엇의 가격을 찾으시나요?"
);

assert.equal(
  buildMissingSlotQuestion({ action: "WEATHER", missingSlots: ["location"] }),
  "어느 지역 날씨를 확인할까요?"
);

assert.equal(
  buildMissingSlotQuestion({ action: "NAVIGATE", missingSlots: [] }),
  ""
);

const invalid = validateActionContract({
  action: "NAVIGATE",
  extractedSlots: {},
});
assert.deepEqual(invalid.missingSlots, ["destination"]);
assert.equal(
  buildMissingSlotQuestion({
    action: "NAVIGATE",
    missingSlots: invalid.missingSlots,
  }),
  "어디로 가시나요?"
);

console.log("test-build-missing-slot-question: ok");
