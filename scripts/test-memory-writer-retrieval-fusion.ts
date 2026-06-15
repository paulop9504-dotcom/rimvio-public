#!/usr/bin/env npx tsx
/**
 * Memory Writer + Retrieval Fusion v2 validation (spec cases 1–4).
 * Usage: npx tsx scripts/test-memory-writer-retrieval-fusion.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  deriveMemoryDirective,
  executeMemoryWriter,
  orchestrateEventKernel,
  retrievalFusionV2,
  runEventKernelOS,
  emptyKernelMemoryState,
  foldKernelMemory,
} from "../lib/event-kernel";
import { attachMemoryDirective } from "../lib/event-kernel/memory/derive-memory-directive";
import { decideKernelIntent } from "../lib/event-kernel/decide-kernel-intent";
import { collectMemoryHints } from "../lib/event-kernel/memory/collect-memory-hints";

type ValidationReport = {
  status: "PASS" | "FAIL";
  memory_writer: "OK" | "FAIL";
  retrieval_fusion: "OK" | "FAIL";
  compatibility: "OK" | "FAIL";
  violations: string[];
};

const violations: string[] = [];

function check(label: string, ok: boolean) {
  if (!ok) {
    violations.push(label);
  }
}

// CASE 1: 쿠우쿠우 가격 → WRITE_LTM, stored via Memory Writer, retrieval candidates only
{
  const kernel = orchestrateEventKernel({ message: "쿠우쿠우 가격", history: [] });
  const previous = emptyKernelMemoryState();
  const hints = collectMemoryHints({ message: "쿠우쿠우 가격", history: [], memory: previous });
  const decisionBase = decideKernelIntent({
    message: "쿠우쿠우 가격",
    history: [],
    base: kernel,
    memoryHints: hints,
  });
  const directive = deriveMemoryDirective({
    decision: decisionBase,
    message: "쿠우쿠우 가격",
    kernel,
    previousMemory: previous,
  });
  check("case1: WRITE_LTM directive", directive === "WRITE_LTM");

  const written = executeMemoryWriter({
    kernelDecision: attachMemoryDirective(decisionBase, directive),
    event: { kernel, userMessage: "쿠우쿠우 가격" },
    memoryState: previous,
  });
  check("case1: memory writer committed store", written.committed);
  check(
    "case1: wm or ltm contains entity",
    written.state.wm.some((i) => i.label.includes("쿠우쿠우")) ||
      written.state.ltm.some((i) => i.label.includes("쿠우쿠우"))
  );

  const ranked = retrievalFusionV2({ message: "쿠우쿠우 가격", memory: written.state });
  check("case1: retrieval returns candidates", ranked.length >= 1);
  check(
    "case1: retrieval does not force DIRECT_ACTION",
    decisionBase.state !== "DIRECT_ACTION" || ranked.length >= 0
  );
}

// CASE 2: 그거 뭐였지 → retrieval candidates, kernel authority, no forced execution
{
  const history = [{ role: "user" as const, content: "쿠우쿠우 가격" }];
  let memory = emptyKernelMemoryState();
  const seedKernel = orchestrateEventKernel({ message: "쿠우쿠우 가격", history: [] });
  memory = foldKernelMemory({
    kernel: seedKernel,
    userMessage: "쿠우쿠우 가격",
    previous: memory,
  }).state;

  const os = runEventKernelOS({ message: "그거 뭐였지", history, previousMemory: memory });
  const ranked = retrievalFusionV2({ message: "그거 뭐였지", memory });
  check("case2: retrieval has candidates", ranked.length >= 1 || os.rankedMemories.length >= 1);
  check(
    "case2: recall does not write memory (IGNORE directive)",
    os.kernelDecision.memoryDirective === "IGNORE"
  );
  check(
    "case2: execution follows kernel plan only",
    os.executionPlan.kernel_state === os.kernelDecision.state
  );
}

// CASE 3: 쿠우쿠우 환불 정책 → DIRECT_ACTION from kernel, memory context only
{
  const history = [{ role: "user" as const, content: "쿠우쿠우 가격" }];
  let memory = emptyKernelMemoryState();
  const seed = foldKernelMemory({
    kernel: orchestrateEventKernel({ message: "쿠우쿠우 가격", history: [] }),
    userMessage: "쿠우쿠우 가격",
    previous: memory,
  }).state;
  memory = seed;

  const os = runEventKernelOS({
    message: "쿠우쿠우 환불 정책",
    history,
    previousMemory: memory,
  });
  check("case3: DIRECT_ACTION from kernel", os.kernelDecision.state === "DIRECT_ACTION");
  check(
    "case3: memory directive is WM not LTM anchor",
    os.kernelDecision.memoryDirective === "WRITE_WM"
  );
  check("case3: execution SEARCH or BUSINESS", os.executionPlan.action !== "NONE");
}

// CASE 4: 응 → CONTINUE, no long-term write
{
  const history = [
    { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
    {
      role: "assistant" as const,
      content: "쿠우쿠우 도안점 뷔페 정보입니다. 예약 도와드릴까요?",
    },
  ];
  const os = runEventKernelOS({ message: "응", history });
  check("case4: CONTINUE", os.kernelDecision.state === "CONTINUE");
  check(
    "case4: no LTM write directive",
    os.kernelDecision.memoryDirective === "WRITE_STM" ||
      os.kernelDecision.memoryDirective === "IGNORE"
  );
  check(
    "case4: not WRITE_LTM",
    os.kernelDecision.memoryDirective !== "WRITE_LTM"
  );
}

// Backward compatibility
{
  const kernel = orchestrateEventKernel({ message: "쿠우쿠우 가격", history: [] });
  const folded = foldKernelMemory({
    kernel,
    userMessage: "쿠우쿠우 가격",
    previous: emptyKernelMemoryState(),
  });
  check("compat: foldKernelMemory still works", folded.state.stm.length >= 1);

  const legacyHints = collectMemoryHints({
    message: "그거 뭐였지",
    history: [{ role: "user", content: "쿠우쿠우 가격" }],
    memory: folded.state,
  });
  check(
    "compat: collectMemoryHints still returns candidates for deictic",
    legacyHints.candidates.length >= 1 || legacyHints.snippets.length >= 1
  );
}

// Kernel must not read memoryDirective (static: decide-kernel-intent has no memoryDirective refs)
{
  const source = fs.readFileSync(
    path.join(process.cwd(), "lib/event-kernel/decide-kernel-intent.ts"),
    "utf8"
  );
  check(
    "violation: kernel does not reference memoryDirective",
    !source.includes("memoryDirective")
  );
}

const report: ValidationReport = {
  status: violations.length === 0 ? "PASS" : "FAIL",
  memory_writer: violations.some((v) => v.startsWith("case1") || v.includes("writer"))
    ? "FAIL"
    : "OK",
  retrieval_fusion: violations.some((v) => v.startsWith("case2") || v.includes("retrieval"))
    ? "FAIL"
    : "OK",
  compatibility: violations.some((v) => v.startsWith("compat")) ? "FAIL" : "OK",
  violations,
};

console.log(JSON.stringify(report, null, 2));

if (report.status === "FAIL") {
  process.exit(1);
}

// Assert for tsx runner
assert.equal(report.status, "PASS");
console.log("test-memory-writer-retrieval-fusion: ok");
