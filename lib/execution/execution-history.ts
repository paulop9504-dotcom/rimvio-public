import type { ExecutionRecord } from "@/lib/execution/execution-contract";

const HISTORY: ExecutionRecord[] = [];
const MAX_HISTORY = 500;

/**
 * Append-only execution log — future Learning Layer reads here only.
 */
export function appendExecutionHistory(record: ExecutionRecord): void {
  HISTORY.push(structuredClone(record));
  if (HISTORY.length > MAX_HISTORY) {
    HISTORY.splice(0, HISTORY.length - MAX_HISTORY);
  }
}

export function listExecutionHistory(): readonly ExecutionRecord[] {
  return HISTORY;
}

export function getExecutionFromHistory(executionId: string): ExecutionRecord | null {
  return HISTORY.find((row) => row.executionId === executionId) ?? null;
}

export function resetExecutionHistoryForTests(): void {
  HISTORY.length = 0;
}

/** Learning-oriented aggregates (deterministic, no LLM). */
export function summarizeExecutionHistory() {
  const rows = listExecutionHistory();
  const completed = rows.filter((row) => row.status === "completed").length;
  const failed = rows.filter((row) => row.status === "failed").length;
  const retried = rows.filter((row) => row.retryCount > 0).length;
  const byProvider = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== "completed") {
      continue;
    }
    byProvider.set(row.providerId, (byProvider.get(row.providerId) ?? 0) + 1);
  }
  return {
    total: rows.length,
    completed,
    failed,
    retried,
    successRate: rows.length === 0 ? 0 : completed / rows.length,
    providerPreference: [...byProvider.entries()].sort((a, b) => b[1] - a[1]),
  };
}
