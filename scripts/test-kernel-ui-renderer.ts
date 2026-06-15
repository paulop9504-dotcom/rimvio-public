#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  executeKernelDecision,
  orchestrateEventKernel,
  renderKernelUi,
  buildKernelUiRenderInput,
} from "../lib/event-kernel";

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

const closeKernel = orchestrateEventKernel({ message: "고마워", history: diningHistory });
const closeExec = executeKernelDecision(closeKernel);
assert.ok(closeExec.result?.meta?.kernel_ui);

const input = closeExec.result!.meta!.kernel_ui!;
assert.equal(input.response_hint, "네.");
assert.equal(input.decision, "DIRECT_ACTION");
assert.deepEqual(input.frame.entities, closeKernel.frame.entities);
assert.equal(input.result?.summary, "네.");

const directModel = renderKernelUi(input);
assert.equal(directModel.kind, "direct");
assert.equal(directModel.sectionLabel, "🧠 핵심");
assert.equal(directModel.coreMessage, "네.");
assert.equal(directModel.actionCards.length, 0);
assert.equal(directModel.nextActionLabel, null);

const optionsKernel = orchestrateEventKernel({ message: "음...", history: diningHistory });
if (optionsKernel.committedDecision === "OPTIONS") {
  const optionsExec = executeKernelDecision(optionsKernel);
  const optionsInput = optionsExec.result!.meta!.kernel_ui!;
  const optionsModel = renderKernelUi(optionsInput);
  assert.equal(optionsModel.kind, "options");
  assert.equal(optionsModel.sectionLabel, "👉 선택하세요");
  assert.ok(optionsModel.actionCards.length <= 3);
  assert.equal(optionsModel.coreMessage, "");
}

const clarifyInput = buildKernelUiRenderInput(
  { ...closeKernel, committedDecision: "CLARIFY" },
  "무엇을 도와드릴까요?"
);
const clarifyModel = renderKernelUi(clarifyInput);
assert.equal(clarifyModel.kind, "clarify");
assert.equal(clarifyModel.sectionLabel, "👉 하나만 물어보기");
assert.equal(clarifyModel.coreMessage, "무엇을 도와드릴까요?");
assert.equal(clarifyModel.actionCards.length, 0);

console.log("test-kernel-ui-renderer: ok");
