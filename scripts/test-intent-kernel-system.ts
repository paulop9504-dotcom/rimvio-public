#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  collectMemoryHints,
  composeIntentKernelOutput,
  planExecution,
  decideKernelIntent,
  formatIntentKernelSystemOutput,
  orchestrateEventKernel,
  resetKernelMemoryStoreForTests,
  runEventKernelOS,
} from "../lib/event-kernel";

resetKernelMemoryStoreForTests();

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

function assertSystem(
  label: string,
  os: ReturnType<typeof runEventKernelOS>,
  expect: {
    state: string;
    action: string;
    route?: string;
  }
) {
  assert.equal(os.system.kernel.state, expect.state, `${label}: kernel.state`);
  assert.equal(os.system.execution.action, expect.action, `${label}: execution.action`);
  if (expect.route) {
    assert.equal(os.system.kernel.route, expect.route, `${label}: kernel.route`);
  }
  assert.equal(os.execution.hint, os.output.hint);
}

const ackOs = runEventKernelOS({
  message: "응",
  history: [...diningHistory, { role: "assistant", content: "예약 도와드릴까요?" }],
});
assertSystem('1. "응" after question', ackOs, {
  state: "CONTINUE",
  action: "DELEGATE",
  route: "DELEGATE_CONTINUE",
});
assert.equal(ackOs.execution.disposition, "delegate");

const priceOs = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });
assertSystem('2. "쿠우쿠우 가격"', priceOs, {
  state: "DIRECT_ACTION",
  action: "BUSINESS_LOOKUP",
  route: "BUSINESS_LOOKUP",
});
assert.equal(priceOs.execution.disposition, "delegate");

const recallOs = runEventKernelOS({ message: "그거 뭐였지", history: diningHistory });
assertSystem('3a. "그거 뭐였지" + context (kernel accepts memory hint)', recallOs, {
  state: "DIRECT_ACTION",
  action: "SEARCH",
  route: "GENERAL_SEARCH",
});
assert.ok(recallOs.system.memory.candidates.length >= 1);
assert.equal(recallOs.kernelDecision.notes?.startsWith("kernel_accept"), true);

const clarifyOs = runEventKernelOS({ message: "그거 뭐였지", history: [] });
assertSystem('3b. "그거 뭐였지" no context', clarifyOs, {
  state: "CLARIFY_A",
  action: "CLARIFY",
  route: "CLARIFY",
});
assert.equal(clarifyOs.system.memory.candidates.length, 0);

const standaloneAck = runEventKernelOS({ message: "응", history: diningHistory });
assertSystem('4. standalone "응"', standaloneAck, {
  state: "TERMINAL_ACK",
  action: "NONE",
  route: "TERMINAL_ACK",
});

const base = orchestrateEventKernel({ message: "그거 뭐였지", history: diningHistory });
const hints = collectMemoryHints({
  message: "그거 뭐였지",
  history: diningHistory,
  memory: recallOs.memory,
});
const decision = decideKernelIntent({
  message: "그거 뭐였지",
  history: diningHistory,
  base,
  memoryHints: hints,
});
const system = composeIntentKernelOutput({
  kernel: decision,
  memory: hints,
  plan: planExecution(decision, recallOs.memory),
});
const parsed = JSON.parse(formatIntentKernelSystemOutput(system));
assert.deepEqual(Object.keys(parsed).sort(), ["execution", "kernel", "memory"]);
assert.deepEqual(Object.keys(parsed.kernel).sort(), ["confidence", "intent", "route", "state"]);
assert.deepEqual(Object.keys(parsed.execution).sort(), ["action"]);
assert.ok(parsed.memory.candidates.length >= 1);

const misaligned = decideKernelIntent({
  message: "그거 뭐였지",
  history: diningHistory,
  base,
  memoryHints: {
    candidates: [{ entity: "태풍장미", score: 0.99, source: "injected" }],
    scores: [0.99],
    snippets: diningHistory.map((t) => `${t.role}:${t.content}`),
  },
});
assert.notEqual(misaligned.state, "DIRECT_ACTION");
assert.ok(!misaligned.notes?.startsWith("kernel_accept"));
assert.match(misaligned.state, /^CLARIFY_/);

console.log("test-intent-kernel-system: ok");
