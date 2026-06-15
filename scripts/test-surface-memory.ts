#!/usr/bin/env npx tsx
import assert from "node:assert/strict";

import {
  buildSurfaceActionKey,
  commitSurfaceMemoryFromExecution,
  onActionCompleted,
  onActionDismissed,
  readSurfaceMemoryContext,
  resetSurfaceMemoryStoreForTests,
} from "@/lib/memory";
import {
  buildSurfacesFromLife,
  selectPrimaryAction,
} from "@/lib/surface-engine";
import {
  FIXTURE_BUILD_CONTEXT,
  FIXTURE_LIFE_PROJECTIONS,
  FIXTURE_OSAKA_TRAVEL,
} from "@/lib/surface-engine/surface-test-fixtures";
import { computeRawPriorityScore } from "@/lib/surface-engine/surface-priority";
import type { ExecutionRecord } from "@/lib/execution/execution-contract";
import { resetExecutionDispatcherForTests } from "@/lib/execution/execution-dispatcher";
import { resetExecutionQueueForTests } from "@/lib/execution/execution-queue";
import { dispatchCapability } from "@/lib/capability-registry";
import { resetExecutionHistoryForTests } from "@/lib/execution/execution-history";
import { runExecutionJob } from "@/lib/execution/execution-engine";

function testActionKeyAndCommit() {
  resetSurfaceMemoryStoreForTests();
  const surfaceId = "surface:ec:ec-osaka-1";
  const key = buildSurfaceActionKey(surfaceId, "BOOK_FLIGHT");
  assert.equal(key, `${surfaceId}:BOOK_FLIGHT`);

  onActionCompleted({ surfaceId, capabilityId: "BOOK_FLIGHT" });
  const ctx = readSurfaceMemoryContext();
  assert.ok(ctx.completedActionIds.includes(key));
  assert.equal(ctx.dismissedSurfaceIds.length, 0);
}

function testDismissSuppressesPriority() {
  resetSurfaceMemoryStoreForTests();
  const surfaceId = "surface:ec:ec-osaka-1";
  onActionDismissed({ surfaceId });
  const ctx = readSurfaceMemoryContext();
  assert.ok(ctx.dismissedSurfaceIds.includes(surfaceId));

  const score = computeRawPriorityScore({
    event: FIXTURE_OSAKA_TRAVEL,
    surfaceId,
    context: {
      ...FIXTURE_BUILD_CONTEXT,
      dismissedSurfaceIds: ctx.dismissedSurfaceIds,
    },
    now: FIXTURE_BUILD_CONTEXT.now ?? new Date(),
    primaryCapabilityId: "BOOK_FLIGHT",
  });
  assert.equal(score.score, 0);
}

function testTravelChainAfterMemory() {
  resetSurfaceMemoryStoreForTests();
  const surfaceId = "surface:ec:ec-osaka-1";
  onActionCompleted({ surfaceId, capabilityId: "BOOK_FLIGHT" });
  const ctx = readSurfaceMemoryContext();

  const step2 = selectPrimaryAction(
    FIXTURE_OSAKA_TRAVEL,
    surfaceId,
    "travel",
    {
      ...FIXTURE_BUILD_CONTEXT,
      completedActionIds: ctx.completedActionIds,
    },
  );
  assert.equal(step2.capabilityId, "BOOK_HOTEL");
}

function testExecutionPipelineCommit() {
  resetSurfaceMemoryStoreForTests();
  resetExecutionDispatcherForTests();
  resetExecutionQueueForTests();
  resetExecutionHistoryForTests();

  const surfaceId = "surface:ec:ec-osaka-1";
  const dispatched = dispatchCapability({
    capabilityId: "BOOK_FLIGHT",
    inputs: { title: "오사카", destination: "오사카" },
    metadata: { surfaceId },
  });
  assert.equal(dispatched.ok, true);
  if (!dispatched.ok) {
    return;
  }

  const completed = runExecutionJob(dispatched.executionId);
  assert.equal(completed?.status, "completed");

  const ctx = readSurfaceMemoryContext();
  assert.ok(
    ctx.completedActionIds.includes(buildSurfaceActionKey(surfaceId, "BOOK_FLIGHT")),
  );
}

function testDismissFromExecutionRecord() {
  resetSurfaceMemoryStoreForTests();
  const surfaceId = "surface:ec:reminder-1";
  const record: ExecutionRecord = {
    executionId: "exec-test-1",
    capabilityId: "DISMISS_SURFACE",
    providerId: "rimvio-internal",
    payload: { label: "dismiss", inputs: {}, mode: "prompt" },
    status: "completed",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    metadata: { surfaceId },
    retryCount: 0,
  };
  commitSurfaceMemoryFromExecution(record);
  const ctx = readSurfaceMemoryContext();
  assert.ok(ctx.dismissedSurfaceIds.includes(surfaceId));
}

function testSurfacesConsumeMemoryContext() {
  resetSurfaceMemoryStoreForTests();
  const surfaceId = "surface:ec:ec-osaka-1";
  onActionDismissed({ surfaceId });
  const ctx = readSurfaceMemoryContext();
  const surfaces = buildSurfacesFromLife(FIXTURE_LIFE_PROJECTIONS, {
    ...FIXTURE_BUILD_CONTEXT,
    dismissedSurfaceIds: ctx.dismissedSurfaceIds,
  });
  const osaka = surfaces.find((row) => row.id === surfaceId);
  assert.ok(osaka);
  assert.equal(osaka.visibility, "hidden");
}

function main() {
  testActionKeyAndCommit();
  testDismissSuppressesPriority();
  testTravelChainAfterMemory();
  testExecutionPipelineCommit();
  testDismissFromExecutionRecord();
  testSurfacesConsumeMemoryContext();
  console.log("test-surface-memory: ok");
}

main();
