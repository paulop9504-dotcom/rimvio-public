#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  EVENT_KERNEL_SCHEMA_LOCK_VERSION,
  LOCKED_CAUSAL_TRACE_EDGES,
  LOCKED_EVENT_CATEGORIES,
  LOCKED_EVENT_LIFECYCLES,
  LOCKED_EXECUTION_EDGE_RELATIONS,
  LOCKED_KERNEL_COMMIT_DECISIONS,
  LOCKED_LIFECYCLE_ORDER,
  LOCKED_SSOT_WRITE_APIS,
  assertValidEventCandidateWire,
  assertValidEventKernelStrictOutput,
  assertValidExecutionGraphEdges,
  isAllowedLifecycleMutation,
  validateEventCandidateWire,
  validateExecutionGraphEdges,
} from "../lib/event-kernel/schema-lock";
import { serializeEventKernelOutput } from "../lib/event-kernel/serialize-event-kernel-output";
import type { EventKernelState } from "../lib/event-kernel/types";
import { uniformMicroIntentDistribution } from "../lib/event-kernel/types";
import { baseRelationGraph } from "../lib/event-os/causal-graph";
import { LIFECYCLE_ORDER } from "../lib/events/event-lifecycle";

const violations: string[] = [];

function fail(msg: string) {
  violations.push(msg);
}

assert.equal(LIFECYCLE_ORDER.join(","), LOCKED_LIFECYCLE_ORDER.join(","), "lifecycle order drift");

if (!isAllowedLifecycleMutation("mentioned", "candidate")) {
  fail("mentioned->candidate should be allowed");
}
if (isAllowedLifecycleMutation("scheduled", "candidate")) {
  fail("scheduled->candidate must be forbidden");
}

const badWire = validateEventCandidateWire({ id: "", title: "", category: "bogus", lifecycle: "x" });
if (!badWire.some((i) => i.code === "invalid_category")) {
  fail("invalid category not detected");
}

const wireNoId = validateEventCandidateWire({
  title: "치과",
  category: "schedule",
  source: "message",
  lifecycle: "mentioned",
  confidence: 0.8,
});
if (wireNoId.length > 0) {
  fail(`wire without id should pass: ${wireNoId.map((i) => i.code).join(",")}`);
}

try {
  assertValidEventCandidateWire({
    id: "ec-1",
    title: "치과",
    category: "schedule",
    source: "message",
    lifecycle: "mentioned",
    confidence: 0.8,
  });
} catch {
  fail("valid wire rejected");
}

assertValidExecutionGraphEdges([
  { from: "a", to: "b", relation: "CAUSES" },
]);
const badEdge = validateExecutionGraphEdges([{ from: "a", to: "b", relation: "FORK" as "CAUSES" }]);
if (!badEdge.length) {
  fail("invalid execution relation not detected");
}

const graph = baseRelationGraph();
if (graph.edges.length !== LOCKED_CAUSAL_TRACE_EDGES.length) {
  fail("causal graph edge count drift");
}

const state: EventKernelState = {
  frame: { entities: [], intent_hint: "", modifiers: [], context: "", raw: "test" },
  microIntentDistribution: uniformMicroIntentDistribution(),
  entropy: 0.1,
  committedDecision: "DIRECT_ACTION",
  dominantIntent: "CONTINUE",
  turnPressure: 0,
  actions: [],
  responseHint: "ok",
  signals: [],
  history: [],
};

const serialized = serializeEventKernelOutput(state);
assertValidEventKernelStrictOutput(serialized);

const fingerprint = createHash("sha256")
  .update(
    JSON.stringify({
      v: EVENT_KERNEL_SCHEMA_LOCK_VERSION,
      categories: LOCKED_EVENT_CATEGORIES,
      lifecycles: LOCKED_EVENT_LIFECYCLES,
      edges: LOCKED_EXECUTION_EDGE_RELATIONS,
      kernelDecisions: LOCKED_KERNEL_COMMIT_DECISIONS,
      writeApis: LOCKED_SSOT_WRITE_APIS,
      traceEdges: LOCKED_CAUSAL_TRACE_EDGES,
    }),
  )
  .digest("hex")
  .slice(0, 16);

const EXPECTED_FINGERPRINT = "7c8bf2c92c053c61";
if (fingerprint !== EXPECTED_FINGERPRINT) {
  fail(`schema fingerprint changed: ${fingerprint} (expected ${EXPECTED_FINGERPRINT})`);
}

if (violations.length > 0) {
  console.error("test-event-kernel-schema-lock failures:");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log(`test-event-kernel-schema-lock: ok (${EVENT_KERNEL_SCHEMA_LOCK_VERSION} · ${fingerprint})`);
