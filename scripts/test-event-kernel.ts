#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  classifyMicroIntentDistribution,
} from "../lib/event-kernel/classify-micro-intent-distribution";
import { computeMicroIntentEntropy } from "../lib/event-kernel/compute-entropy";
import {
  kernelRequiresEarlyReturn,
  resolveCommitDecision,
} from "../lib/event-kernel/commit-gate";
import {
  orchestrateEventKernel,
  projectIntentRouteFromKernel,
  eventKernelToOrchestratorResult,
  KERNEL_MICRO_INTENT_KEYS,
  serializeEventKernelOutput,
} from "../lib/event-kernel";

function sumDistribution(d: Record<string, number>) {
  return KERNEL_MICRO_INTENT_KEYS.reduce((acc, key) => acc + d[key], 0);
}

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

const closeKernel = orchestrateEventKernel({ message: "고마워", history: diningHistory });
assert.ok(closeKernel.microIntentDistribution.CLOSE > 0.5);
assert.ok(Math.abs(sumDistribution(closeKernel.microIntentDistribution) - 1) < 0.001);
assert.ok(closeKernel.entropy < 0.3);
assert.equal(closeKernel.committedDecision, "DIRECT_ACTION");
assert.ok(kernelRequiresEarlyReturn(closeKernel));

const closeEarly = eventKernelToOrchestratorResult(closeKernel);
assert.ok(closeEarly);
assert.match(closeEarly!.summary, /알겠|네/);

const ackKernel = orchestrateEventKernel({
  message: "응",
  history: [...diningHistory, { role: "assistant", content: "예약 도와드릴까요?" }],
});
assert.ok(ackKernel.microIntentDistribution.CONTINUE > 0.4);
assert.ok(!kernelRequiresEarlyReturn(ackKernel));

const queryKernel = orchestrateEventKernel({
  message: "가격은 얼마야?",
  history: diningHistory,
});
assert.ok(queryKernel.microIntentDistribution.QUERY > 0.4);
assert.equal(queryKernel.committedDecision, "DIRECT_ACTION");
assert.ok(!kernelRequiresEarlyReturn(queryKernel));

const route = projectIntentRouteFromKernel({
  kernel: queryKernel,
  message: "가격은 얼마야?",
  history: diningHistory,
  linkTitle: "쿠우쿠우",
});
assert.equal(route.intent_type, "NEW_TASK");
assert.equal(route.execution_mode, "action");
assert.equal(route.continuity, "NEW_TASK");
assert.ok(route.kernel_entropy >= 0);

const { distribution } = classifyMicroIntentDistribution({
  message: "음...",
  history: diningHistory,
});
const ambiguousEntropy = computeMicroIntentEntropy(distribution);
assert.ok(ambiguousEntropy > 0.5);

const clarifyKernel = orchestrateEventKernel({ message: "음...", history: diningHistory });
if (clarifyKernel.committedDecision === "CLARIFY") {
  assert.ok(kernelRequiresEarlyReturn(clarifyKernel));
  assert.ok(clarifyKernel.responseHint.length > 0);
  assert.match(clarifyKernel.responseHint, /도와|관련/);
}

const strict = serializeEventKernelOutput(queryKernel);
assert.deepEqual(Object.keys(strict).sort(), [
  "decision",
  "entropy",
  "frame",
  "micro_intent",
  "response_hint",
]);
assert.equal(strict.decision, queryKernel.committedDecision);
assert.ok(Math.abs(
  KERNEL_MICRO_INTENT_KEYS.reduce((acc, key) => acc + strict.micro_intent[key], 0) - 1
) < 0.001);
assert.deepEqual(Object.keys(strict.frame).sort(), ["entities", "intent_hint", "modifiers"]);

console.log("test-event-kernel: ok");
