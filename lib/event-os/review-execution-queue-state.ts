import type { ReviewExecutionInput } from "@/lib/event-os/review-execution-types";

const reviewExecutionQueue: ReviewExecutionInput[] = [];

export function getReviewExecutionQueueSnapshot(): readonly ReviewExecutionInput[] {
  return [...reviewExecutionQueue];
}

export function shiftReviewExecution(
  scopeId?: string
): ReviewExecutionInput | undefined {
  const index = reviewExecutionQueue.findIndex(
    (row) => !scopeId || row.scopeId === scopeId
  );
  if (index < 0) {
    return undefined;
  }
  return reviewExecutionQueue.splice(index, 1)[0];
}

export function pushReviewExecution(input: ReviewExecutionInput): void {
  reviewExecutionQueue.push({
    ...input,
    enqueuedAt: input.enqueuedAt ?? new Date().toISOString(),
  });
}

export function resetReviewExecutionQueueForTests(): void {
  reviewExecutionQueue.length = 0;
}
