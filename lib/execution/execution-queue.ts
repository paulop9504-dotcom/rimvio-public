import type { ExecutionRecord } from "@/lib/execution/execution-contract";
import { compareExecutionJobs } from "@/lib/execution/execution-priority";

const QUEUE = new Map<string, ExecutionRecord>();

export function queueExecution(record: ExecutionRecord): void {
  QUEUE.set(record.executionId, record);
}

export function getQueuedExecution(executionId: string): ExecutionRecord | null {
  return QUEUE.get(executionId) ?? null;
}

export function updateQueuedExecution(record: ExecutionRecord): void {
  QUEUE.set(record.executionId, record);
}

export function listQueuedExecutions(): ExecutionRecord[] {
  return [...QUEUE.values()].sort(compareExecutionJobs);
}

export function removeQueuedExecution(executionId: string): void {
  QUEUE.delete(executionId);
}

export function resetExecutionQueueForTests(): void {
  QUEUE.clear();
}
