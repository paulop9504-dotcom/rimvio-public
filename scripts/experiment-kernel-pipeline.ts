#!/usr/bin/env npx tsx

/**
 * Kernel → memory → execution chain smoke test.
 */

import {
  executeKernelDecision,
  resetKernelMemoryStoreForTests,
  runEventKernelOS,
} from "../lib/event-kernel";

resetKernelMemoryStoreForTests();

const diningHistory = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];

type CaseResult = {
  label: string;
  pass: boolean;
  kernelDecision: string;
  memoryCandidates: number;
  execution: string;
  note: string;
};

function runCase(input: {
  label: string;
  message: string;
  history?: typeof diningHistory;
  expect: { state: string; action: string; disposition: string };
}): CaseResult {
  const os = runEventKernelOS({
    message: input.message,
    history: input.history ?? [],
  });

  const checks: string[] = [];
  if (os.system.kernel.state !== input.expect.state) {
    checks.push(`state=${os.system.kernel.state}`);
  }
  if (os.system.execution.action !== input.expect.action) {
    checks.push(`action=${os.system.execution.action}`);
  }
  if (os.execution.disposition !== input.expect.disposition) {
    checks.push(`disposition=${os.execution.disposition}`);
  }

  const legacy = executeKernelDecision(os.kernel);
  if (os.system.kernel.state !== "DIRECT_ACTION" && legacy.disposition !== os.execution.disposition) {
    checks.push("legacy execution drift (expected for kernel-intent path)");
  }

  return {
    label: input.label,
    pass: checks.length === 0,
    kernelDecision: os.system.kernel.state,
    memoryCandidates: os.system.memory.candidates.length,
    execution: `${os.execution.disposition}/${os.execution.hint}`,
    note: checks.length === 0 ? "OK" : checks.join("; "),
  };
}

const cases = [
  runCase({
    label: '1. "응" → CONTINUE',
    message: "응",
    history: [...diningHistory, { role: "assistant", content: "예약 도와드릴까요?" }],
    expect: { state: "CONTINUE", action: "DELEGATE", disposition: "delegate" },
  }),
  runCase({
    label: '2. "쿠우쿠우 가격"',
    message: "쿠우쿠우 가격",
    expect: { state: "DIRECT_ACTION", action: "BUSINESS_LOOKUP", disposition: "delegate" },
  }),
  runCase({
    label: '3a. "그거 뭐였지" + context (kernel accepts memory hint)',
    message: "그거 뭐였지",
    history: diningHistory,
    expect: { state: "DIRECT_ACTION", action: "SEARCH", disposition: "delegate" },
  }),
  runCase({
    label: '3b. "그거 뭐_was지" no context',
    message: "그거 뭐였지",
    expect: { state: "CLARIFY_A", action: "CLARIFY", disposition: "terminal" },
  }),
];

console.log("\n=== Intent Kernel System Experiment ===\n");
let failed = 0;
for (const result of cases) {
  const mark = result.pass ? "✅" : "❌";
  if (!result.pass) {
    failed += 1;
  }
  console.log(`${mark} ${result.label}`);
  console.log(`   kernel  : ${result.kernelDecision}`);
  console.log(`   memory  : ${result.memoryCandidates} candidate(s)`);
  console.log(`   exec    : ${result.execution}`);
  console.log(`   chain   : ${result.note}\n`);
}

process.exit(failed > 0 ? 1 : 0);
