#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  formatIntentRoutingDecision,
  resetKernelMemoryStoreForTests,
  routeIntentKernel,
  runEventKernelOS,
} from "../lib/event-kernel";

resetKernelMemoryStoreForTests();

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

function assertRouting(
  label: string,
  os: ReturnType<typeof runEventKernelOS>,
  expect: {
    intent: string;
    route: string;
  }
) {
  const routing = os.system.kernel;
  assert.equal(routing.intent, expect.intent, `${label}: intent`);
  assert.equal(routing.route, expect.route, `${label}: route`);
}

const ackOs = runEventKernelOS({
  message: "응",
  history: [...diningHistory, { role: "assistant", content: "예약 도와드릴까요?" }],
});
assertRouting('1. "응" after question', ackOs, {
  intent: "CONTINUE",
  route: "DELEGATE_CONTINUE",
});
assert.equal(ackOs.execution.hint, "continue");

const priceOs = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });
assertRouting('2. "쿠우쿠우 가격"', priceOs, {
  intent: "DIRECT_ACTION",
  route: "BUSINESS_LOOKUP",
});

const recallOs = runEventKernelOS({ message: "그거 뭐였지", history: diningHistory });
assertRouting('3a. "그거 뭐였지" with context', recallOs, {
  intent: "DIRECT_ACTION",
  route: "GENERAL_SEARCH",
});
assert.equal(recallOs.execution.hint, "search");

const clarifyOs = runEventKernelOS({ message: "그거 뭐였지", history: [] });
assertRouting('3b. "그거 뭐_was지" no context', clarifyOs, {
  intent: "CLARIFY",
  route: "CLARIFY",
});
assert.equal(clarifyOs.execution.hint, "clarify");

const standaloneAck = runEventKernelOS({ message: "응", history: diningHistory });
assertRouting('4. standalone "응"', standaloneAck, {
  intent: "TERMINAL_ACK",
  route: "TERMINAL_ACK",
});

const legacy = routeIntentKernel({
  message: "쿠우쿠우 가격",
  kernel: priceOs.kernel,
  memory: priceOs.memory,
});
assert.ok(formatIntentRoutingDecision(legacy).includes("BUSINESS_LOOKUP"));

console.log("test-intent-routing-kernel: ok");
