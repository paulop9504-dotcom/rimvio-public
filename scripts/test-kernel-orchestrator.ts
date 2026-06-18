#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  executeKernelDecision,
  executeKernelFromStrictOutput,
  formatOptionsExecutionResponse,
  kernelExecutionIsTerminal,
  orchestrateEventKernel,
  eventKernelToOrchestratorResult,
  serializeEventKernelOutput,
} from "../lib/event-kernel";

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

const closeKernel = orchestrateEventKernel({ message: "고마워", history: diningHistory });
const closeExec = executeKernelDecision(closeKernel);
assert.equal(closeExec.disposition, "terminal");
assert.equal(closeExec.hint, "close");
assert.ok(kernelExecutionIsTerminal(closeExec));
assert.equal(closeExec.result?.summary, "네.");

const ackKernel = orchestrateEventKernel({
  message: "응",
  history: [...diningHistory, { role: "assistant", content: "예약 도와드릴까요?" }],
});
const ackExec = executeKernelDecision(ackKernel);
assert.equal(ackExec.disposition, "delegate");
assert.equal(ackExec.hint, "continue");
assert.equal(ackExec.result, null);

const queryKernel = orchestrateEventKernel({
  message: "가격은 얼마야?",
  history: diningHistory,
});
const queryExec = executeKernelDecision(queryKernel);
assert.equal(queryExec.disposition, "delegate");
assert.equal(queryExec.hint, "search");
assert.equal(queryExec.result, null);
assert.equal(eventKernelToOrchestratorResult(queryKernel), null);

const optionsKernel = orchestrateEventKernel({ message: "음...", history: diningHistory });
if (optionsKernel.committedDecision === "OPTIONS") {
  const optionsExec = executeKernelDecision(optionsKernel);
  assert.equal(optionsExec.hint, "options");
  assert.ok(optionsExec.result?.summary.includes("-"));
  assert.ok((optionsExec.result?.actions.length ?? 0) <= 3);
}

const formatted = formatOptionsExecutionResponse([
  { id: "a", label: "검색", kind: "search" },
  { id: "b", label: "이어서", kind: "continue" },
]);
assert.match(formatted, /^- 검색\n- 이어서$/);

const badDecision = executeKernelDecision({
  ...closeKernel,
  committedDecision: "INVALID" as typeof closeKernel.committedDecision,
});
assert.equal(badDecision.hint, "clarify");
assert.equal(badDecision.result?.summary, "무엇을 도와드릴까요?");

const wire = serializeEventKernelOutput(closeKernel);
const fromWire = executeKernelFromStrictOutput(wire, closeKernel);
assert.equal(fromWire.result?.summary, closeExec.result?.summary);

console.log("test-kernel-orchestrator: ok");
