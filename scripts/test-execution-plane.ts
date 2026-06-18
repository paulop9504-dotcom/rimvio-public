#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import { dispatchCapability } from "@/lib/capability-registry";
import {
  cancelExecution,
  enqueueExecution,
  markExecutionFailed,
  resetExecutionDispatcherForTests,
  resetExecutionHistoryForTests,
  resetExecutionQueueForTests,
  retryExecution,
  runExecutionJob,
  summarizeExecutionHistory,
} from "@/lib/execution";
import { resetLearningEngineForTests } from "@/lib/learning";
import {
  getQueuedExecution,
  updateQueuedExecution,
} from "@/lib/execution/execution-queue";
import {
  FIXTURE_CALL_JOB,
  FIXTURE_NAVIGATE_JOB,
} from "@/lib/execution/execution-test-fixtures";
import { assertTransition, canTransition } from "@/lib/execution/execution-lifecycle";
import { listExecutionAdapters } from "@/lib/execution/adapters/register-adapters";

function resetAll() {
  resetLearningEngineForTests();
  resetExecutionQueueForTests();
  resetExecutionHistoryForTests();
  resetExecutionDispatcherForTests();
}

function testLifecycle() {
  assert.ok(canTransition("queued", "ready"));
  assert.ok(canTransition("ready", "executing"));
  assert.ok(canTransition("executing", "completed"));
  assert.ok(canTransition("executing", "failed"));
  assert.ok(!canTransition("completed", "executing"));
  assertTransition("queued", "ready");
}

function testQueueAndRun() {
  resetAll();
  const enqueued = enqueueExecution(FIXTURE_NAVIGATE_JOB);
  assert.equal(enqueued.ok, true);
  if (!enqueued.ok) {
    return;
  }
  assert.equal(enqueued.execution.status, "ready");

  const done = runExecutionJob(enqueued.execution.executionId);
  assert.ok(done);
  assert.equal(done?.status, "completed");
  assert.ok(done?.result?.uri);
}

function testCancel() {
  resetAll();
  const enqueued = enqueueExecution(FIXTURE_CALL_JOB);
  assert.equal(enqueued.ok, true);
  if (!enqueued.ok) {
    return;
  }
  const cancelled = cancelExecution(enqueued.execution.executionId);
  assert.equal(cancelled?.status, "cancelled");
}

function testRetry() {
  resetAll();
  const invalid = enqueueExecution({
    capabilityId: "NAVIGATE",
    providerId: "kakao_navi",
    inputs: {},
  });
  assert.equal(invalid.ok, false);

  const good = enqueueExecution(FIXTURE_CALL_JOB);
  assert.equal(good.ok, true);
  if (!good.ok) {
    return;
  }
  const execId = good.execution.executionId;
  const record = getQueuedExecution(execId);
  assert.ok(record);
  record.status = "executing";
  record.startedAt = new Date().toISOString();
  updateQueuedExecution(record);

  const failed = markExecutionFailed(execId, "test_failure");
  assert.equal(failed?.status, "failed");

  const retried = retryExecution(execId);
  assert.equal(retried?.status, "ready");
  assert.equal(retried?.retryCount, 1);

  const done = runExecutionJob(execId);
  assert.equal(done?.status, "completed");
}

function testDispatchBridge() {
  resetAll();
  const result = dispatchCapability({
    capabilityId: "NAVIGATE",
    inputs: { destination: "강남역" },
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.executionId.startsWith("exec-"));
    const done = runExecutionJob(result.executionId);
    assert.equal(done?.status, "completed");
  }
}

function testAdapterContracts() {
  const adapters = listExecutionAdapters();
  assert.ok(adapters.length >= 4);
  for (const adapter of adapters) {
    assert.ok(adapter.id);
    assert.ok(adapter.capabilityIds.length > 0);
    assert.equal(typeof adapter.buildPayload, "function");
    assert.equal(typeof adapter.execute, "function");
  }
}

function testHistory() {
  resetAll();
  dispatchCapability({ capabilityId: "SEARCH", inputs: { query: "오사카 여행" } });
  const summary = summarizeExecutionHistory();
  assert.ok(summary.total >= 1);
}

testLifecycle();
testQueueAndRun();
testCancel();
testRetry();
testDispatchBridge();
testAdapterContracts();
testHistory();

console.log("test-execution-plane: ok");
