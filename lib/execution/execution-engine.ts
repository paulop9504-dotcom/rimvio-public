import type { AdapterExecuteContext } from "@/lib/execution/adapters/adapter-contract";
import { getAdapterForCapability } from "@/lib/execution/adapters/register-adapters";
import type { ExecutionRecord } from "@/lib/execution/execution-contract";
import { appendExecutionHistory } from "@/lib/execution/execution-history";
import { assertTransition } from "@/lib/execution/execution-lifecycle";
import {
  getQueuedExecution,
  listQueuedExecutions,
  updateQueuedExecution,
} from "@/lib/execution/execution-queue";
import {
  markExecutionComplete,
  markExecutionFailed,
} from "@/lib/execution/execution-dispatcher";
import { failureResult } from "@/lib/execution/execution-result";

export type RunExecutionContext = AdapterExecuteContext;

/** Execute one job through its adapter. */
export function runExecutionJob(
  executionId: string,
  context: RunExecutionContext = {},
): ExecutionRecord | null {
  const record = getQueuedExecution(executionId);
  if (!record || record.status !== "ready") {
    return null;
  }

  assertTransition(record.status, "executing");
  record.status = "executing";
  record.startedAt = new Date().toISOString();
  updateQueuedExecution(record);
  appendExecutionHistory(record);

  const adapter = getAdapterForCapability(record.capabilityId);
  if (!adapter) {
    return markExecutionFailed(executionId, "no_adapter");
  }

  try {
    const result = adapter.execute(record.payload, context);
    if (result.ok) {
      return markExecutionComplete(executionId, {
        ...result,
        providerId: record.providerId,
      });
    }
    return markExecutionFailed(executionId, result.message ?? "adapter_failed", result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return markExecutionFailed(executionId, message, failureResult(message));
  }
}

/** Drain ready jobs in priority order (deterministic). */
export function runExecutionQueue(context: RunExecutionContext = {}): ExecutionRecord[] {
  const completed: ExecutionRecord[] = [];
  const ready = listQueuedExecutions().filter((row) => row.status === "ready");
  for (const job of ready) {
    const result = runExecutionJob(job.executionId, context);
    if (result) {
      completed.push(result);
    }
  }
  return completed;
}

export function getExecutionState(executionId: string): ExecutionRecord | null {
  return getQueuedExecution(executionId);
}
