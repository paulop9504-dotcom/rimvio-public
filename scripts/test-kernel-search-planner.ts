#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  foldKernelMemory,
  orchestrateEventKernel,
  orchestrateEventKernelWithMemory,
  planKernelSearch,
  kernelShouldPlanSearch,
} from "../lib/event-kernel";
import { emptyKernelMemoryState } from "../lib/event-kernel/memory/types";

const simpleKernel = orchestrateEventKernel({ message: "쿠우쿠우 가격", history: [] });
assert.ok(kernelShouldPlanSearch(simpleKernel));
const simplePlan = planKernelSearch({
  kernel: simpleKernel,
  userMessage: "쿠우쿠우 가격",
});
assert.equal(simplePlan.search_type, "SIMPLE");
assert.match(simplePlan.canonical_query, /쿠우쿠우/);
assert.match(simplePlan.canonical_query, /가격/);
assert.equal(simplePlan.multi_hop_steps.length, 0);

const history = [
  { role: "user" as const, content: "쿠우쿠우 도안점 정보 알려줘" },
  { role: "assistant" as const, content: "쿠우쿠우 도안점 뷔페 정보입니다." },
];
const memorySeed = foldKernelMemory({
  kernel: orchestrateEventKernel({ message: "쿠우쿠우 도안점 정보 알려줘", history: [] }),
  userMessage: "쿠우쿠우 도안점 정보 알려줘",
  previous: emptyKernelMemoryState(),
});

const followUpKernel = orchestrateEventKernel({
  message: "가격은 얼마야?",
  history,
});
const followUpPlan = planKernelSearch({
  kernel: followUpKernel,
  memory: memorySeed.state,
  userMessage: "가격은 얼마야?",
});
assert.ok(followUpPlan.memory_bias.length >= 1);
assert.match(followUpPlan.canonical_query, /쿠우쿠우|가격/);
assert.ok(followUpPlan.fallback_queries.length >= 0);

const ambiguousKernel = orchestrateEventKernel({ message: "음...", history });
const ambiguousPlan = planKernelSearch({
  kernel: ambiguousKernel,
  userMessage: "음...",
});
if (ambiguousKernel.entropy >= 0.7) {
  assert.equal(ambiguousPlan.search_type, "MULTI_HOP");
  assert.ok(ambiguousPlan.multi_hop_steps.length >= 2);
}

const bundled = orchestrateEventKernelWithMemory({
  message: "쿠우쿠우 가격",
  history: [],
});
assert.ok(bundled.searchPlan);
assert.equal(bundled.searchPlan!.search_type, "SIMPLE");

assert.deepEqual(Object.keys(simplePlan).sort(), [
  "canonical_query",
  "expanded_queries",
  "fallback_queries",
  "memory_bias",
  "multi_hop_steps",
  "notes",
  "search_type",
]);

console.log("test-kernel-search-planner: ok");
