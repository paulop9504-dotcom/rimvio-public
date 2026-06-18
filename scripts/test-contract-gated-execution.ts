#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  evaluateContractGate,
  runEventKernelOS,
  resetKernelMemoryStoreForTests,
} from "../lib/event-kernel";

resetKernelMemoryStoreForTests();

const navigateGate = evaluateContractGate("길찾기");
assert.equal(navigateGate.state, "MISSING_SLOT");
if (navigateGate.state === "MISSING_SLOT") {
  assert.equal(navigateGate.action, "NAVIGATE");
  assert.equal(navigateGate.question, "어디로 가시나요?");
}

const priceGate = evaluateContractGate("가격 알려줘");
assert.equal(priceGate.state, "MISSING_SLOT");
if (priceGate.state === "MISSING_SLOT") {
  assert.equal(priceGate.action, "PRICE_LOOKUP");
  assert.equal(priceGate.question, "무엇의 가격을 찾으시나요?");
}

const mealGate = evaluateContractGate("오늘 점심 추천");
assert.equal(mealGate.state, "PROCEED");

const navigateOs = runEventKernelOS({ message: "길찾기", history: [] });
assert.equal(navigateOs.contractGate.state, "MISSING_SLOT");
assert.equal(navigateOs.execution.hint, "missing_slot");
assert.equal(navigateOs.output.summary, "어디로 가시나요?");
assert.equal(navigateOs.execution.disposition, "terminal");
assert.equal(navigateOs.kernel.committedDecision, "OPTIONS");

const priceOs = runEventKernelOS({ message: "가격 알려줘", history: [] });
assert.equal(priceOs.contractGate.state, "MISSING_SLOT");
assert.equal(priceOs.output.summary, "무엇의 가격을 찾으시나요?");
assert.notEqual(priceOs.execution.hint, "search");
assert.equal(priceOs.kernelDecision.state, "DIRECT_ACTION");

const mealOs = runEventKernelOS({ message: "오늘 점심 추천", history: [] });
assert.equal(mealOs.contractGate.state, "PROCEED");
assert.equal(mealOs.execution.hint, "search");
assert.equal(mealOs.output.disposition, "delegate");

const filledOs = runEventKernelOS({ message: "인천공항 가는 길", history: [] });
assert.equal(filledOs.contractGate.state, "PROCEED");

console.log("test-contract-gated-execution: ok");
