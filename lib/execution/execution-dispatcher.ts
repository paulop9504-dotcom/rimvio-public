import { getCapability } from "@/lib/capability-registry/capability-registry";
import { getAdapterForCapability } from "@/lib/execution/adapters/register-adapters";
import type {
  EnqueueExecutionInput,
  ExecutionDispatchResult,
  ExecutionRecord,
} from "@/lib/execution/execution-contract";
import { appendExecutionHistory } from "@/lib/execution/execution-history";
import { ingestExecutionOutcome } from "@/lib/learning/learning-engine";
import { commitSurfaceMemoryFromExecution } from "@/lib/memory/surface-memory-commit";
import { applySynapticFromExecution } from "@/lib/synaptic/synapse-engine";
import { wireLoopFromCapabilityExecution } from "@/lib/loop-wiring/loop-wiring-engine";
import { assertTransition } from "@/lib/execution/execution-lifecycle";
import {
  getQueuedExecution,
  queueExecution,
  removeQueuedExecution,
  updateQueuedExecution,
} from "@/lib/execution/execution-queue";

let executionCounter = 0;

function nextExecutionId(): string {
  executionCounter += 1;
  return `exec-${Date.now()}-${executionCounter}`;
}

function createRecord(input: EnqueueExecutionInput): ExecutionRecord | null {
  const capability = getCapability(input.capabilityId);
  const adapter = getAdapterForCapability(input.capabilityId);
  if (!capability || !adapter) {
    return null;
  }

  const inputs = input.inputs ?? {};
  const built = adapter.buildPayload({
    capabilityId: input.capabilityId,
    providerId: input.providerId,
    inputs,
    label: input.label ?? capability.name,
    mode: input.mode ?? capability.executionMode,
  });
  if (!built) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    executionId: nextExecutionId(),
    capabilityId: input.capabilityId,
    providerId: input.providerId,
    payload: {
      label: input.label ?? capability.name,
      inputs,
      uri: built.uri,
      fallbackUri: built.fallbackUri,
      mode: input.mode ?? capability.executionMode,
    },
    status: "queued",
    createdAt: now,
    metadata: input.metadata,
    retryCount: 0,
  };
}

/** Enqueue — capabilities never execute directly. */
export function enqueueExecution(input: EnqueueExecutionInput): ExecutionDispatchResult {
  const record = createRecord(input);
  if (!record) {
    return { ok: false, reason: "enqueue_failed", capabilityId: input.capabilityId };
  }
  queueExecution(record);
  assertTransition(record.status, "ready");
  record.status = "ready";
  updateQueuedExecution(record);
  appendExecutionHistory(record);
  return { ok: true, execution: record };
}

export function cancelExecution(executionId: string): ExecutionRecord | null {
  const record = getQueuedExecution(executionId);
  if (!record) {
    return null;
  }
  assertTransition(record.status, "cancelled");
  record.status = "cancelled";
  record.completedAt = new Date().toISOString();
  updateQueuedExecution(record);
  appendExecutionHistory(record);
  ingestExecutionOutcome(record);
  removeQueuedExecution(executionId);
  return record;
}

export function retryExecution(executionId: string): ExecutionRecord | null {
  const record = getQueuedExecution(executionId);
  if (!record || record.status !== "failed") {
    return null;
  }
  assertTransition(record.status, "ready");
  record.status = "ready";
  record.retryCount += 1;
  record.error = undefined;
  record.result = undefined;
  record.completedAt = undefined;
  record.startedAt = undefined;
  updateQueuedExecution(record);
  appendExecutionHistory(record);
  return record;
}

export function resumeExecution(executionId: string): ExecutionRecord | null {
  const record = getQueuedExecution(executionId);
  if (!record || record.status !== "cancelled") {
    return null;
  }
  record.status = "ready";
  record.completedAt = undefined;
  updateQueuedExecution(record);
  appendExecutionHistory(record);
  return record;
}

export function markExecutionComplete(
  executionId: string,
  result: ExecutionRecord["result"],
): ExecutionRecord | null {
  const record = getQueuedExecution(executionId);
  if (!record) {
    return null;
  }
  assertTransition(record.status, "completed");
  record.status = "completed";
  record.result = result;
  record.completedAt = new Date().toISOString();
  updateQueuedExecution(record);
  appendExecutionHistory(record);
  ingestExecutionOutcome(record);
  commitSurfaceMemoryFromExecution(record);
  applySynapticFromExecution(record);
  wireLoopFromCapabilityExecution({
    capabilityId: record.capabilityId,
    executedAt: record.completedAt,
  });
  removeQueuedExecution(executionId);
  return record;
}

export function markExecutionFailed(
  executionId: string,
  error: string,
  result?: ExecutionRecord["result"],
): ExecutionRecord | null {
  const record = getQueuedExecution(executionId);
  if (!record) {
    return null;
  }
  assertTransition(record.status, "failed");
  record.status = "failed";
  record.error = error;
  record.result = result;
  record.completedAt = new Date().toISOString();
  updateQueuedExecution(record);
  appendExecutionHistory(record);
  ingestExecutionOutcome(record);
  wireLoopFromCapabilityExecution({
    capabilityId: record.capabilityId,
    executedAt: record.completedAt,
  });
  return record;
}

export function resetExecutionDispatcherForTests(): void {
  executionCounter = 0;
}
