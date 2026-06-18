#!/usr/bin/env npx tsx

/**
 * Adversarial tests — Intent Kernel System reliability.
 * Verifies kernel authority, memory non-override, execution alignment.
 */

import assert from "node:assert/strict";
import {
  decideKernelIntent,
  mapKernelToExecutionAction,
  orchestrateEventKernel,
  planExecution,
  resetKernelMemoryStoreForTests,
  runEventKernelOS,
} from "../lib/event-kernel";
import type { KernelIntentDecision } from "../lib/event-kernel/intent-kernel-system/types";
import type { MemoryHints } from "../lib/event-kernel/intent-kernel-system/types";

resetKernelMemoryStoreForTests();

type OsResult = ReturnType<typeof runEventKernelOS>;

function expectedPlanAction(decision: KernelIntentDecision) {
  return planExecution(decision, null).action;
}

function assertExecutionMatchesKernel(os: OsResult, label: string) {
  const expected = expectedPlanAction(os.kernelDecision);
  assert.equal(os.executionPlan.action, expected, `${label}: executionPlan.action`);
  assert.equal(os.system.execution.action, expected, `${label}: system.execution.action`);
  assert.equal(os.executionPlan.kernel_state, os.kernelDecision.state, `${label}: plan.kernel_state`);
  assert.equal(os.executionPlan.kernel_route, os.kernelDecision.route, `${label}: plan.kernel_route`);
}

function assertMemoryDoesNotOverrideKernel(os: OsResult, label: string) {
  const { trace, kernelDecision } = os;

  if (trace.memory_influence === "HINT_USED") {
    assert.ok(
      kernelDecision.notes?.startsWith("kernel_accept:"),
      `${label}: memory HINT_USED requires kernel_accept note`
    );
  }

  if (trace.memory_influence === "IGNORED" && os.system.memory.candidates.length > 0) {
    assert.ok(
      !kernelDecision.notes?.startsWith("kernel_accept:"),
      `${label}: ignored memory must not show kernel_accept`
    );
  }

  assert.ok(
    !kernelDecision.notes?.includes("threshold"),
    `${label}: no score-threshold language in kernel notes`
  );
}

function assertNotScoreGatedAccept(decision: KernelIntentDecision, label: string) {
  assert.ok(
    !decision.notes?.match(/score\s*[≥>=]+\s*0\.[0-9]/i),
    `${label}: no score-gated accept in notes`
  );
}

function runCase(input: {
  label: string;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  assertFn: (os: OsResult) => void;
}) {
  const os = runEventKernelOS({
    message: input.message,
    history: input.history ?? [],
  });
  assertExecutionMatchesKernel(os, input.label);
  assertMemoryDoesNotOverrideKernel(os, input.label);
  assertNotScoreGatedAccept(os.kernelDecision, input.label);
  input.assertFn(os);
}

// CASE 1 — deictic ambiguity; must not force SEARCH without kernel ACCEPT
runCase({
  label: "CASE 1: 그거 뭐였지 + 쿠우쿠우 가격 context",
  message: "그거 뭐였지",
  history: [{ role: "user", content: "쿠우쿠우 가격" }],
  assertFn: (os) => {
    const state = os.kernelDecision.state;
    assert.ok(
      state === "CLARIFY_A" ||
        state === "CLARIFY_B" ||
        (state === "DIRECT_ACTION" && os.kernelDecision.notes?.startsWith("kernel_accept:")),
      "expected CLARIFY_A/B or kernel ACCEPT — not blind search"
    );

    if (state === "DIRECT_ACTION") {
      assert.ok(
        os.kernelDecision.notes?.startsWith("kernel_accept:"),
        "SEARCH/BUSINESS_LOOKUP only when kernel explicitly ACCEPTs"
      );
      assert.ok(
        os.executionPlan.action === "SEARCH" || os.executionPlan.action === "BUSINESS_LOOKUP",
        "ACCEPT may map to search actions"
      );
    } else {
      assert.equal(os.executionPlan.action, "CLARIFY");
      assert.equal(os.execution.disposition, "terminal");
    }

    if (os.trace.memory_influence === "HINT_USED") {
      assert.ok(
        os.kernelDecision.notes?.startsWith("kernel_accept:"),
        "memory HINT_USED requires kernel ACCEPT — not forced search"
      );
    }
  },
});

// CASE 2 — policy query with aligned context; memory score is hint only
runCase({
  label: "CASE 2: 쿠우쿠우 환불 정책이 뭐야 (explicit policy query)",
  message: "쿠우쿠우 환불 정책이 뭐야",
  history: [{ role: "user", content: "쿠우쿠우 가격" }],
  assertFn: (os) => {
    assert.equal(os.kernelDecision.state, "DIRECT_ACTION");
    assert.ok(
      os.executionPlan.action === "SEARCH" || os.executionPlan.action === "BUSINESS_LOOKUP",
      "policy query maps to search family"
    );
    assert.equal(os.execution.disposition, "delegate");
    if (os.system.memory.candidates.length > 0) {
      assert.notEqual(os.trace.memory_influence, "HINT_USED", "explicit query must not need memory accept");
    }
  },
});

// CASE 2b — policy phrase with entity: ACTION REQUEST → DIRECT_ACTION (not CLARIFY)
runCase({
  label: "CASE 2b: 쿠우쿠우 환불 정책 (action request — DIRECT_ACTION)",
  message: "쿠우쿠우 환불 정책",
  history: [{ role: "user", content: "쿠우쿠우 가격" }],
  assertFn: (os) => {
    assert.equal(os.kernelDecision.state, "DIRECT_ACTION");
    assert.equal(os.kernelDecision.route, "BUSINESS_LOOKUP");
    assert.ok(
      os.executionPlan.action === "SEARCH" || os.executionPlan.action === "BUSINESS_LOOKUP",
      "policy query maps to search family"
    );
    assert.equal(os.execution.disposition, "delegate");
    assert.equal(os.kernelDecision.notes, "action_request");
  },
});

// CASE 3 — continuation after question
runCase({
  label: 'CASE 3: "응" after question',
  message: "응",
  history: [
    { role: "user", content: "쿠우쿠우 도안점 정보 알려줘" },
    { role: "assistant", content: "예약 도와드릴까요?" },
  ],
  assertFn: (os) => {
    assert.equal(os.kernelDecision.state, "CONTINUE");
    assert.equal(os.executionPlan.action, "DELEGATE");
    assert.equal(os.execution.disposition, "delegate");
    assert.equal(os.execution.hint, "continue");
  },
});

// CASE 4 — memory mismatch must be IGNORED (high score must not override)
{
  const base = orchestrateEventKernel({ message: "쿠우쿠우", history: [] });
  const wrongMemoryHints: MemoryHints = {
    candidates: [{ entity: "쿠팡", score: 0.99, source: "injected_adversarial" }],
    scores: [0.99],
    snippets: ["user:쿠팡 배송"],
  };

  const decision = decideKernelIntent({
    message: "쿠우쿠우",
    history: [],
    base,
    memoryHints: wrongMemoryHints,
  });

  assertNotScoreGatedAccept(decision, "CASE 4");
  assert.ok(!decision.notes?.startsWith("kernel_accept:"), "CASE 4: 쿠팡 hint not accepted");
  assert.notEqual(decision.canonical_query?.includes("쿠팡"), true, "CASE 4: no 쿠팡 in query");

  const plan = planExecution(decision, null);
  assert.equal(plan.action, mapKernelToExecutionAction(decision, null), "CASE 4: plan matches kernel");

  const os = runEventKernelOS({ message: "쿠우쿠우", history: [] });
  assertExecutionMatchesKernel(os, "CASE 4: pipeline");
  if (os.system.memory.candidates.some((c) => c.entity.includes("쿠팡"))) {
    assert.notEqual(os.trace.memory_influence, "HINT_USED", "CASE 4: 쿠팡 not used");
  }
}

// CASE 5 — explicit price query, empty memory
runCase({
  label: "CASE 5: 쿠우쿠우 가격 (empty memory)",
  message: "쿠우쿠우 가격",
  history: [],
  assertFn: (os) => {
    assert.equal(os.kernelDecision.state, "DIRECT_ACTION");
    assert.ok(
      os.executionPlan.action === "BUSINESS_LOOKUP" || os.executionPlan.action === "SEARCH",
      "price query → BUSINESS_LOOKUP or SEARCH"
    );
    assert.equal(os.trace.memory_influence, "NONE");
    assert.equal(os.execution.disposition, "delegate");
  },
});

// FALSE RECALL — high-score misaligned entity must not become DIRECT_ACTION via memory
{
  const diningHistory = [
    { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
    { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
  ];
  const base = orchestrateEventKernel({ message: "그거 뭐였지", history: diningHistory });
  const falseRecall = decideKernelIntent({
    message: "그거 뭐였지",
    history: diningHistory,
    base,
    memoryHints: {
      candidates: [{ entity: "태풍장미", score: 0.99, source: "injected_false_recall" }],
      scores: [0.99],
      snippets: diningHistory.map((t) => `${t.role}:${t.content}`),
    },
  });

  assert.notEqual(falseRecall.state, "DIRECT_ACTION", "false recall: no DIRECT_ACTION");
  assert.ok(!falseRecall.notes?.startsWith("kernel_accept:"), "false recall: not accepted");
  assert.match(falseRecall.state, /^CLARIFY_/, "false recall: clarify path");
  assert.equal(
    planExecution(falseRecall, null).action,
    "CLARIFY",
    "false recall: execution follows kernel"
  );
}

console.log("test-intent-kernel-adversarial: ok");
