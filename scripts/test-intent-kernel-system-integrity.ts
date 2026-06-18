#!/usr/bin/env npx tsx

/**
 * Full Intent Kernel System integrity harness.
 * Detects structural violations only — does NOT fix.
 */

import fs from "node:fs";
import path from "node:path";
import {
  buildKernelDecisionTrace,
  collectMemoryHints,
  decideKernelIntent,
  orchestrateEventKernel,
  planExecution,
  resetKernelDecisionTraceSinkForTests,
  resetKernelMemoryStoreForTests,
  runEventKernelOS,
  setKernelDecisionTraceSink,
} from "../lib/event-kernel";
import type { KernelIntentDecision } from "../lib/event-kernel/intent-kernel-system/types";

type Failure = {
  case: string;
  violation_type: string;
  layer: "KERNEL" | "MEMORY" | "EXECUTION" | "PLANNER" | "TRACE";
  reason: string;
};

const failures: Failure[] = [];

function fail(
  caseId: string,
  violation_type: string,
  layer: Failure["layer"],
  reason: string
) {
  failures.push({ case: caseId, violation_type, layer, reason });
}

function assertInvariants(caseId: string, os: ReturnType<typeof runEventKernelOS>) {
  const { kernelDecision, executionPlan, system, trace, execution } = os;

  if (executionPlan.kernel_state !== kernelDecision.state) {
    fail(
      caseId,
      "EXECUTION_PLANNER_STATE_DRIFT",
      "PLANNER",
      `plan.kernel_state=${executionPlan.kernel_state} kernel=${kernelDecision.state}`
    );
  }

  if (executionPlan.action !== system.execution.action) {
    fail(
      caseId,
      "SYSTEM_EXECUTION_DRIFT",
      "EXECUTION",
      `system.execution=${system.execution.action} plan=${executionPlan.action}`
    );
  }

  const replanned = planExecution(kernelDecision, os.memory);
  if (replanned.action !== executionPlan.action) {
    fail(
      caseId,
      "PLANNER_NON_DETERMINISTIC",
      "PLANNER",
      `re-plan action=${replanned.action} original=${executionPlan.action}`
    );
  }

  if (trace.memory_influence === "HINT_USED" && !kernelDecision.notes?.startsWith("kernel_accept:")) {
    fail(
      caseId,
      "MEMORY_OVERRIDE_KERNEL",
      "MEMORY",
      "trace HINT_USED without kernel_accept note"
    );
  }

  if (
    kernelDecision.notes?.startsWith("kernel_accept:") &&
    trace.memory_influence !== "HINT_USED"
  ) {
    fail(
      caseId,
      "TRACE_MEMORY_INFLUENCE_MISMATCH",
      "TRACE",
      "kernel_accept but trace memory_influence is not HINT_USED"
    );
  }

  if (kernelDecision.notes?.match(/score\s*[≥>=]+\s*0\.[0-9]/i)) {
    fail(caseId, "SCORE_THRESHOLD_IN_NOTES", "KERNEL", kernelDecision.notes ?? "");
  }

  if (kernelDecision.state === "DIRECT_ACTION" && execution.disposition === "terminal") {
    const contractMissing =
      execution.result?.meta?.contract_state === "MISSING_SLOT" ||
      execution.hint === "missing_slot";
    const isAck =
      kernelDecision.state === "TERMINAL_ACK" ||
      kernelDecision.state === "ACK";
    if (!isAck && !contractMissing) {
      fail(
        caseId,
        "EXECUTION_KERNEL_MISMATCH",
        "EXECUTION",
        `DIRECT_ACTION but terminal execution hint=${execution.hint}`
      );
    }
  }
}

resetKernelMemoryStoreForTests();
resetKernelDecisionTraceSinkForTests();

// Static scan: memory score must not gate decisions in decide-kernel-intent
const decideSource = fs.readFileSync(
  path.join(process.cwd(), "lib/event-kernel/decide-kernel-intent.ts"),
  "utf8"
);
if (/MEMORY_(ACCEPT|STRONG)_THRESHOLD|bestScore\s*[<>]|bestCandidate\.score\s*[<>]=/.test(decideSource)) {
  fail(
    "GLOBAL",
    "SCORE_THRESHOLD_IN_KERNEL",
    "KERNEL",
    "decide-kernel-intent.ts contains memory score threshold gating"
  );
}

// CASE 1 — Deictic continuity
{
  const caseId = "CASE 1";
  const history = [{ role: "user" as const, content: "쿠우쿠우 가격" }];
  const os = runEventKernelOS({ message: "그거 뭐였지", history });
  assertInvariants(caseId, os);

  const state = os.kernelDecision.state;
  const allowed =
    state === "CLARIFY_A" ||
    state === "CLARIFY_B" ||
    (state === "DIRECT_ACTION" && os.kernelDecision.notes?.startsWith("kernel_accept:"));

  if (!allowed) {
    fail(
      caseId,
      "DEICTIC_AUTO_OVERRIDE",
      "KERNEL",
      `state=${state} notes=${os.kernelDecision.notes ?? ""}`
    );
  }

  if (state === "DIRECT_ACTION" && !os.kernelDecision.notes?.startsWith("kernel_accept:")) {
    fail(
      caseId,
      "DEICTIC_EXECUTION_WITHOUT_KERNEL_APPROVAL",
      "EXECUTION",
      "DIRECT_ACTION without kernel_accept"
    );
  }

  if (os.system.memory.candidates.length === 0) {
    fail(caseId, "MEMORY_NO_CANDIDATE", "MEMORY", "expected memory candidate hint only");
  }
}

// CASE 2 — High-score memory conflict
{
  const caseId = "CASE 2";
  const history = [{ role: "user" as const, content: "쿠우쿠우 가격" }];
  const base = orchestrateEventKernel({ message: "쿠우쿠우 환불 정책", history });
  const hints = collectMemoryHints({
    message: "쿠우쿠우 환불 정책",
    history,
    memory: null,
    frameEntities: base.frame.entities,
  });

  const injected = {
    ...hints,
    candidates: [{ entity: "쿠우쿠우", score: 0.99, source: "injected" }, ...hints.candidates],
    scores: [0.99, ...hints.scores],
  };

  const decision = decideKernelIntent({
    message: "쿠우쿠우 환불 정책",
    history,
    base,
    memoryHints: injected,
  });

  const os = runEventKernelOS({ message: "쿠우쿠우 환불 정책", history });
  assertInvariants(caseId, os);

  if (decision.notes?.startsWith("kernel_accept:") && decision.state !== "DIRECT_ACTION") {
    fail(caseId, "MEMORY_ACCEPT_INCONSISTENT", "MEMORY", "accept note on non-DIRECT_ACTION");
  }

  if (decision.state !== "DIRECT_ACTION") {
    fail(
      caseId,
      "EXPECTED_KERNEL_STATE",
      "KERNEL",
      `expected DIRECT_ACTION got ${decision.state} (injected score 0.99 must not decide)`
    );
  }

  if (decision.canonical_query?.includes("쿠팡")) {
    fail(caseId, "MEMORY_POISONING", "MEMORY", "wrong entity in canonical_query");
  }
}

// CASE 3 — Continuation ACK
{
  const caseId = "CASE 3";
  const os = runEventKernelOS({
    message: "응",
    history: [
      { role: "user", content: "쿠우쿠우 도안점 정보 알려줘" },
      { role: "assistant", content: "예약 도와드릴까요?" },
    ],
  });
  assertInvariants(caseId, os);

  if (os.kernelDecision.state !== "CONTINUE") {
    fail(caseId, "EXPECTED_KERNEL_STATE", "KERNEL", `got ${os.kernelDecision.state}`);
  }
  if (os.kernelDecision.route !== "DELEGATE_CONTINUE") {
    fail(caseId, "EXPECTED_KERNEL_ROUTE", "KERNEL", `got ${os.kernelDecision.route}`);
  }
  if (os.executionPlan.action !== "DELEGATE") {
    fail(caseId, "EXPECTED_EXECUTION_ACTION", "EXECUTION", os.executionPlan.action);
  }
}

// CASE 4 — Memory mismatch poisoning
{
  const caseId = "CASE 4";
  const base = orchestrateEventKernel({ message: "쿠우쿠우", history: [] });
  const decision = decideKernelIntent({
    message: "쿠우쿠우",
    history: [],
    base,
    memoryHints: {
      candidates: [{ entity: "쿠팡", score: 0.95, source: "injected" }],
      scores: [0.95],
      snippets: ["user:쿠팡 배송"],
    },
  });

  if (decision.notes?.startsWith("kernel_accept:")) {
    fail(caseId, "MEMORY_MISMATCH_ACCEPTED", "MEMORY", "쿠팡 accepted over 쿠우쿠우");
  }
  if (decision.canonical_query?.includes("쿠팡")) {
    fail(caseId, "MEMORY_BIAS_EXECUTION", "EXECUTION", "canonical_query contains 쿠팡");
  }

  const plan = planExecution(decision, null);
  if (plan.action !== planExecution(decision, null).action) {
    fail(caseId, "PLANNER_UNSTABLE", "PLANNER", "plan changed between calls");
  }
}

// CASE 5 — No memory strong intent
{
  const caseId = "CASE 5";
  const os = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });
  assertInvariants(caseId, os);

  if (os.kernelDecision.state !== "DIRECT_ACTION") {
    fail(caseId, "EXPECTED_KERNEL_STATE", "KERNEL", os.kernelDecision.state);
  }
  if (
    os.executionPlan.action !== "BUSINESS_LOOKUP" &&
    os.executionPlan.action !== "SEARCH"
  ) {
    fail(caseId, "EXPECTED_EXECUTION_ACTION", "EXECUTION", os.executionPlan.action);
  }
  if (os.trace.memory_influence !== "NONE") {
    fail(caseId, "UNEXPECTED_MEMORY_INFLUENCE", "MEMORY", os.trace.memory_influence);
  }
}

// CASE 6 — Pure ambiguity
{
  const caseId = "CASE 6";
  const os = runEventKernelOS({ message: "그거 뭐였지", history: [] });
  assertInvariants(caseId, os);

  if (os.kernelDecision.state !== "CLARIFY_A") {
    fail(
      caseId,
      "EXPECTED_KERNEL_STATE",
      "KERNEL",
      `expected CLARIFY_A got ${os.kernelDecision.state}`
    );
  }
  if (os.kernelDecision.notes?.startsWith("kernel_accept:")) {
    fail(caseId, "FORCED_RECALL", "KERNEL", "recall without context");
  }
  if (os.executionPlan.action !== "CLARIFY") {
    fail(caseId, "EXPECTED_EXECUTION_ACTION", "EXECUTION", os.executionPlan.action);
  }
}

// CASE 7 — Trace logger validation
{
  const caseId = "CASE 7";
  const traces: ReturnType<typeof buildKernelDecisionTrace>[] = [];
  setKernelDecisionTraceSink((t) => traces.push(t));

  const os1 = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });
  resetKernelDecisionTraceSinkForTests();
  const os2 = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });

  assertInvariants(caseId, os1);

  if (!os1.trace) {
    fail(caseId, "TRACE_MISSING", "TRACE", "trace not attached to OS result");
  } else {
    if (!os1.trace.deictic?.status) {
      fail(caseId, "TRACE_DEICTIC_MISSING", "TRACE", "deictic.status absent");
    }
    if (!os1.trace.memory_influence) {
      fail(caseId, "TRACE_MEMORY_INFLUENCE_MISSING", "TRACE", "memory_influence absent");
    }
    if (!os1.trace.rationale?.length) {
      fail(caseId, "TRACE_RATIONALE_MISSING", "TRACE", "rationale empty");
    }
  }

  if (
    os1.kernelDecision.state !== os2.kernelDecision.state ||
    os1.kernelDecision.route !== os2.kernelDecision.route
  ) {
    fail(
      caseId,
      "TRACE_INFLUENCED_DECISION",
      "TRACE",
      "decision differed with trace sink enabled vs disabled"
    );
  }
}

// CASE 8 — Execution planner isolation
{
  const caseId = "CASE 8";
  const os = runEventKernelOS({ message: "쿠우쿠우 가격", history: [] });
  const before: KernelIntentDecision = { ...os.kernelDecision };
  const plan = planExecution(os.kernelDecision, os.memory);

  if (plan.kernel_state !== before.state || plan.kernel_route !== before.route) {
    fail(
      caseId,
      "PLANNER_REINTERPRETED_INTENT",
      "PLANNER",
      "plan mutated kernel state/route"
    );
  }

  const allowed =
    (before.state === "DIRECT_ACTION" &&
      (plan.action === "SEARCH" || plan.action === "BUSINESS_LOOKUP")) ||
    before.state !== "DIRECT_ACTION";

  if (!allowed) {
    fail(
      caseId,
      "PLANNER_INVALID_MAPPING",
      "PLANNER",
      `DIRECT_ACTION mapped to ${plan.action}`
    );
  }

  if (plan.action !== os.system.execution.action) {
    fail(
      caseId,
      "EXECUTION_PLANNER_DRIFT",
      "EXECUTION",
      `plan=${plan.action} system=${os.system.execution.action}`
    );
  }
}

const report = {
  overall_status: failures.length === 0 ? ("PASS" as const) : ("FAIL" as const),
  failures,
  summary:
    failures.length === 0
      ? "All 8 cases passed structural invariants: kernel authority, memory isolation, planner mapping, execution alignment, trace passivity."
      : `${failures.length} structural violation(s) detected across ${new Set(failures.map((f) => f.case)).size} case(s).`,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
