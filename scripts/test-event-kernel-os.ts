#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  eventKernelOSIsTerminal,
  resetKernelMemoryStoreForTests,
  runEventKernelOS,
} from "../lib/event-kernel";

resetKernelMemoryStoreForTests();

const history = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

const close = runEventKernelOS({ message: "고마워", history });
assert.ok(eventKernelOSIsTerminal(close));
assert.equal(close.output.disposition, "terminal");
assert.match(close.output.summary, /네/);
assert.equal(close.execution.hint, "close");
assert.ok(close.ui);
assert.equal(close.ui!.kind, "direct");
assert.ok(close.kernelWire.decision);
assert.equal(Object.keys(close.kernelWire.micro_intent).length, 6);

const query = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });
assert.equal(query.output.disposition, "delegate");
assert.equal(query.output.hint, "search");
assert.ok(query.searchPlan);
assert.match(query.searchPlan!.canonical_query, /쿠우쿠우/);
assert.equal(query.output.summary, "");

const followUp = runEventKernelOS({
  message: "가격은?",
  history,
  previousMemory: query.memory,
});
assert.equal(followUp.contractGate.state, "MISSING_SLOT");
assert.equal(followUp.output.disposition, "terminal");
assert.match(followUp.output.summary, /가격/);
assert.ok(followUp.memory.session_topic || followUp.memory.wm.length > 0);
assert.ok(followUp.memoryOutput.stm.length >= 1);

const ambiguous = runEventKernelOS({ message: "음...", history });
if (ambiguous.kernel.committedDecision === "CLARIFY") {
  assert.ok(eventKernelOSIsTerminal(ambiguous));
  assert.equal(ambiguous.ui?.kind, "clarify");
  assert.ok(ambiguous.output.summary.length > 0);
  assert.equal(ambiguous.output.actions.length, 0);
}

assert.deepEqual(
  Object.keys(runEventKernelOS({ message: "응", history }).output).sort(),
  ["actions", "disposition", "hint", "summary"]
);

console.log("test-event-kernel-os: ok");
