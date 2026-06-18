#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import {
  enqueueExecution,
  markExecutionFailed,
  resetExecutionDispatcherForTests,
  resetExecutionHistoryForTests,
  resetExecutionQueueForTests,
} from "@/lib/execution";
import { FIXTURE_CALL_JOB } from "@/lib/execution/execution-test-fixtures";
import { getQueuedExecution, updateQueuedExecution } from "@/lib/execution/execution-queue";
import {
  getCapabilityWeight,
  getCapabilityLearningBoost,
  ingestObservation,
  listObservations,
  observeIgnoredPrimaryAction,
  replayLearningFromObservations,
  resetLearningEngineForTests,
} from "@/lib/learning";
import {
  FIXTURE_IGNORE_NAVIGATE,
  FIXTURE_NAVIGATE_SUCCESS,
  fixtureNavigateReinforcementBatch,
} from "@/lib/learning/learning-test-fixtures";
import { applyWeightDecay, getPreferenceWeightSnapshot } from "@/lib/learning/preference-weights";
import { computeRawPriorityScore } from "@/lib/surface-engine/surface-priority";
import { FIXTURE_OSAKA_TRAVEL } from "@/lib/surface-engine/surface-test-fixtures";

function resetAll() {
  resetLearningEngineForTests();
  resetExecutionQueueForTests();
  resetExecutionHistoryForTests();
  resetExecutionDispatcherForTests();
}

function testObservationCorrectness() {
  resetAll();
  const obs = ingestObservation({
    capabilityId: "NAVIGATE",
    surfaceId: "surface:ec:ec-osaka-1",
    actionType: "execute",
    resultStatus: "success",
    timestamp: "2026-06-04T10:00:00.000Z",
    contextSnapshot: { channel: "FEED", hourBucket: 10 },
  });
  assert.equal(obs.executionId, undefined);
  assert.equal(obs.capabilityId, "NAVIGATE");
  assert.equal(obs.resultStatus, "success");
  assert.equal(listObservations().length, 1);
}

function testWeightUpdateDeterminism() {
  resetAll();
  const batch = fixtureNavigateReinforcementBatch(5);
  const snap1 = replayLearningFromObservations(batch, {
    now: new Date("2026-06-05T10:00:00.000Z"),
    applyDecay: false,
  });
  resetLearningEngineForTests();
  const snap2 = replayLearningFromObservations(batch, {
    now: new Date("2026-06-05T10:00:00.000Z"),
    applyDecay: false,
  });
  assert.deepEqual(snap1.capabilities.NAVIGATE, snap2.capabilities.NAVIGATE);
  assert.ok((snap1.capabilities.NAVIGATE?.weight ?? 0) > 0);
}

function testIgnoreNegativeReinforcement() {
  resetAll();
  ingestObservation(FIXTURE_NAVIGATE_SUCCESS);
  const before = getCapabilityWeight("NAVIGATE");
  observeIgnoredPrimaryAction({
    capabilityId: "NAVIGATE",
    surfaceId: "surface:ec:ec-osaka-1",
  });
  const after = getCapabilityWeight("NAVIGATE");
  assert.ok(after < before);
}

function testDecayBehavior() {
  resetAll();
  ingestObservation(FIXTURE_NAVIGATE_SUCCESS);
  const before = getCapabilityWeight("NAVIGATE");
  applyWeightDecay(new Date("2026-06-10T10:00:00.000Z"));
  const after = getCapabilityWeight("NAVIGATE");
  assert.ok(after < before);
  assert.ok(after > 0);
}

function testSurfaceInfluence() {
  resetAll();
  replayLearningFromObservations(fixtureNavigateReinforcementBatch(6), {
    now: new Date("2026-06-04T12:00:00.000Z"),
    applyDecay: false,
  });
  const navigateBoost = getCapabilityLearningBoost("NAVIGATE");
  const alarmBoost = getCapabilityLearningBoost("ALARM");
  assert.ok(navigateBoost > alarmBoost);

  const sid = "surface:ec:ec-osaka-1";
  const base = computeRawPriorityScore({
    event: FIXTURE_OSAKA_TRAVEL,
    surfaceId: sid,
    context: {},
    now: new Date("2026-06-04T12:00:00.000Z"),
  });
  const boosted = computeRawPriorityScore({
    event: FIXTURE_OSAKA_TRAVEL,
    surfaceId: sid,
    context: {},
    now: new Date("2026-06-04T12:00:00.000Z"),
    primaryCapabilityId: "NAVIGATE",
  });
  assert.ok(boosted.score > base.score);
}

function testReplayConsistency() {
  resetAll();
  const rows = [FIXTURE_NAVIGATE_SUCCESS, FIXTURE_IGNORE_NAVIGATE];
  const snap = replayLearningFromObservations(rows, {
    now: new Date("2026-06-04T13:00:00.000Z"),
    applyDecay: false,
  });
  assert.equal(listObservations().length, 2);
  assert.ok(snap.computedAt.startsWith("2026-06-04"));
}

function testExecutionBridge() {
  resetAll();
  const enqueued = enqueueExecution({
    ...FIXTURE_CALL_JOB,
    metadata: { surfaceId: "surface:ec:test", channel: "CHAT" },
  });
  assert.equal(enqueued.ok, true);
  if (!enqueued.ok) {
    return;
  }
  const execId = enqueued.execution.executionId;
  const record = getQueuedExecution(execId);
  assert.ok(record);
  record.status = "executing";
  updateQueuedExecution(record);
  markExecutionFailed(execId, "test_failure");
  assert.equal(listObservations().length, 1);
  assert.equal(listObservations()[0]?.resultStatus, "fail");
}

function testRetryObservationWeakSignal() {
  resetAll();
  ingestObservation({
    capabilityId: "CALL",
    actionType: "retry_signal",
    resultStatus: "fail",
    timestamp: "2026-06-04T11:00:00.000Z",
  });
  const weight = getCapabilityWeight("CALL");
  assert.ok(weight > 0 && weight < 0.12);
}

testObservationCorrectness();
testWeightUpdateDeterminism();
testIgnoreNegativeReinforcement();
testDecayBehavior();
testSurfaceInfluence();
testReplayConsistency();
testExecutionBridge();
testRetryObservationWeakSignal();

console.log("test-learning-layer: ok");
