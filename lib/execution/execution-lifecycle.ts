import type { ExecutionStatus } from "@/lib/execution/execution-contract";

const ALLOWED: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
  queued: ["ready", "cancelled"],
  ready: ["executing", "cancelled"],
  executing: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["queued", "ready", "cancelled"],
  cancelled: ["ready"],
};

export function canTransition(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(from: ExecutionStatus, to: ExecutionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid execution transition: ${from} → ${to}`);
  }
}

export function isTerminal(status: ExecutionStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}
