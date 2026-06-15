import type { CapabilityId } from "@/lib/capability-registry/capability-contract";
import type { ExecutionRecord } from "@/lib/execution/execution-contract";

const CAPABILITY_WEIGHT: Partial<Record<CapabilityId, number>> = {
  BOOK_FLIGHT: 100,
  BOOK_HOTEL: 95,
  CHECK_IN: 90,
  NAVIGATE: 85,
  TAXI: 84,
  CALL: 80,
  ALARM: 78,
  CALENDAR: 70,
};

export function executionPriorityScore(record: ExecutionRecord): number {
  const base = CAPABILITY_WEIGHT[record.capabilityId] ?? 50;
  const retryPenalty = record.retryCount * 5;
  return Math.max(0, base - retryPenalty);
}

export function compareExecutionJobs(left: ExecutionRecord, right: ExecutionRecord): number {
  return executionPriorityScore(right) - executionPriorityScore(left);
}
