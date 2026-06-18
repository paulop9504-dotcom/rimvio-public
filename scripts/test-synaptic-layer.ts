#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import {
  expandSynapse,
  strengthenSynapse,
  weakenSynapse,
  pruneSynapse,
  readSynapseSnapshot,
  resetSynapseStoreForTests,
  getSynapticPriorityBoost,
  buildSynapseId,
  deriveSynapticHabits,
} from "@/lib/synaptic";
import { computeRawPriorityScore } from "@/lib/surface-engine/surface-priority";
import { FIXTURE_OSAKA_TRAVEL, FIXTURE_BUILD_CONTEXT } from "@/lib/surface-engine/surface-test-fixtures";

function testPlasticityCycle() {
  resetSynapseStoreForTests();
  const surfaceId = "surface:ec:ec-osaka-1";
  const cap = "BOOK_FLIGHT" as const;

  expandSynapse({ surfaceId, capabilityId: cap });
  let edge = readSynapseSnapshot().edges.find((row) => row.id === buildSynapseId(surfaceId, cap));
  assert.ok(edge);
  const w0 = edge!.weight;

  strengthenSynapse({ surfaceId, capabilityId: cap });
  edge = readSynapseSnapshot().edges.find((row) => row.id === buildSynapseId(surfaceId, cap));
  assert.ok(edge!.weight > w0);

  weakenSynapse({ surfaceId, capabilityId: cap, reason: "ignore" });
  const wWeak = readSynapseSnapshot().edges.find((row) => row.id === buildSynapseId(surfaceId, cap))!.weight;
  assert.ok(wWeak < edge!.weight);

  for (let i = 0; i < 8; i += 1) {
    pruneSynapse({ surfaceId, capabilityId: cap });
  }
  const pruned = readSynapseSnapshot().edges.find((row) => row.id === buildSynapseId(surfaceId, cap));
  assert.equal(pruned, undefined);
}

function testPriorityBoost() {
  resetSynapseStoreForTests();
  const surfaceId = "surface:ec:ec-osaka-1";
  const cap = "BOOK_FLIGHT" as const;
  strengthenSynapse({ surfaceId, capabilityId: cap });
  const boost = getSynapticPriorityBoost(surfaceId, cap);
  assert.ok(boost > 0);

  const withSynapse = computeRawPriorityScore({
    event: FIXTURE_OSAKA_TRAVEL,
    surfaceId,
    context: FIXTURE_BUILD_CONTEXT,
    now: FIXTURE_BUILD_CONTEXT.now ?? new Date(),
    primaryCapabilityId: cap,
  });
  resetSynapseStoreForTests();
  const without = computeRawPriorityScore({
    event: FIXTURE_OSAKA_TRAVEL,
    surfaceId,
    context: FIXTURE_BUILD_CONTEXT,
    now: FIXTURE_BUILD_CONTEXT.now ?? new Date(),
    primaryCapabilityId: cap,
  });
  assert.ok(withSynapse.score >= without.score);
}

function testHabitViewModel() {
  resetSynapseStoreForTests();
  const surfaceId = "surface:ec:ec-osaka-1";
  strengthenSynapse({ surfaceId, capabilityId: "BOOK_FLIGHT" });
  strengthenSynapse({ surfaceId, capabilityId: "BOOK_HOTEL" });
  const habits = deriveSynapticHabits({ minWeight: 0.1, limit: 2 });
  assert.ok(habits.length >= 1);
  assert.ok(habits[0]!.label.length > 0);
}

testPlasticityCycle();
testPriorityBoost();
testHabitViewModel();
console.log("test-synaptic-layer: ok");
