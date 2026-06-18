#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  decideKernelIntent,
  collectMemoryHints,
  orchestrateEventKernel,
  planExecution,
  resetKernelMemoryStoreForTests,
  runEventKernelOS,
} from "../lib/event-kernel";

resetKernelMemoryStoreForTests();

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

const priceOs = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });
assert.equal(priceOs.executionPlan.action, "BUSINESS_LOOKUP");
assert.equal(priceOs.system.execution.action, "BUSINESS_LOOKUP");
assert.equal(priceOs.executionPlan.kernel_state, "DIRECT_ACTION");

const ackOs = runEventKernelOS({
  message: "응",
  history: [...diningHistory, { role: "assistant", content: "예약 도와드릴까요?" }],
});
assert.equal(ackOs.executionPlan.action, "DELEGATE");
assert.equal(ackOs.system.execution.action, "DELEGATE");

const clarifyOs = runEventKernelOS({ message: "그거 뭐였지", history: [] });
assert.equal(clarifyOs.executionPlan.action, "CLARIFY");

const standaloneAck = runEventKernelOS({ message: "응", history: diningHistory });
assert.equal(standaloneAck.executionPlan.action, "NONE");

const base = orchestrateEventKernel({ message: "쿠우쿠우 가격", history: [] });
const hints = collectMemoryHints({ message: "쿠우쿠우 가격", history: [], memory: null });
const decision = decideKernelIntent({
  message: "쿠우쿠우 가격",
  history: [],
  base,
  memoryHints: hints,
});
const plan = planExecution(decision, null);
assert.equal(plan.action, "BUSINESS_LOOKUP");
assert.equal(plan.kernel_route, decision.route);
assert.equal(plan.kernel_state, decision.state);

console.log("test-execution-planner: ok");
