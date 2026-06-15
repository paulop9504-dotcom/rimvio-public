#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  resetKernelDecisionTraceSinkForTests,
  resetKernelMemoryStoreForTests,
  runEventKernelOS,
  setKernelDecisionTraceSink,
} from "../lib/event-kernel";

resetKernelMemoryStoreForTests();
resetKernelDecisionTraceSinkForTests();

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

const traces: unknown[] = [];
setKernelDecisionTraceSink((trace) => {
  traces.push(trace);
});

const recallOs = runEventKernelOS({ message: "그거 뭐였지", history: diningHistory });
assert.ok(recallOs.trace);
assert.equal(recallOs.trace.kernel.state, recallOs.system.kernel.state);
assert.equal(recallOs.trace.memory_influence, "HINT_USED");
assert.equal(recallOs.trace.deictic.status, "RESOLVED");
assert.ok(recallOs.trace.rationale.length > 0);
assert.deepEqual(Object.keys(recallOs.system).sort(), ["execution", "kernel", "memory"]);

const clarifyOs = runEventKernelOS({ message: "그거 뭐였지", history: [] });
assert.equal(clarifyOs.trace.deictic.status, "FAILED");
assert.equal(clarifyOs.trace.memory_influence, "NONE");

const priceOs = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });
assert.equal(priceOs.trace.deictic.status, "NOT_ATTEMPTED");
assert.equal(priceOs.trace.memory_influence, "NONE");

assert.equal(traces.length, 3);

console.log("test-kernel-decision-trace: ok");
