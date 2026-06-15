const busyScopes = new Set<string>();
const scopeQueues = new Map<string, Promise<void>>();
const lockDepthByScope = new Map<string, number>();

export type ReviewLockAcquire = {
  acquired: boolean;
  release: () => void;
  reason?: string;
};

/** Non-reentrant lock for explicit acquire/release (tests, guards). */
export function tryAcquireReviewExecutionLock(scopeId: string): ReviewLockAcquire {
  if (busyScopes.has(scopeId)) {
    return {
      acquired: false,
      release: () => {},
      reason: "scope_busy",
    };
  }
  busyScopes.add(scopeId);
  return {
    acquired: true,
    release: () => {
      busyScopes.delete(scopeId);
    },
  };
}

export function isReviewScopeLocked(scopeId: string): boolean {
  return busyScopes.has(scopeId);
}

/** Async tail-chaining per scope (legacy parallel to sync lock). */
export function chainReviewScopeExecution<T>(
  scopeId: string,
  task: () => T | Promise<T>
): Promise<T> {
  const prior = scopeQueues.get(scopeId) ?? Promise.resolve();
  const next = prior.then(task, task);
  scopeQueues.set(
    scopeId,
    next.then(
      () => undefined,
      () => undefined
    )
  );
  return next;
}

/** Reentrant per scope — orchestrate → executeApprove can nest safely. */
export function withReviewExecutionLock<T>(
  scopeId: string,
  fn: () => T
): { ok: true; value: T } | { ok: false; reason: string } {
  const depth = lockDepthByScope.get(scopeId) ?? 0;
  if (depth === 0 && busyScopes.has(scopeId)) {
    return { ok: false, reason: "scope_busy" };
  }
  if (depth === 0) {
    busyScopes.add(scopeId);
  }
  lockDepthByScope.set(scopeId, depth + 1);
  try {
    return { ok: true, value: fn() };
  } finally {
    const nextDepth = depth;
    if (nextDepth === 0) {
      busyScopes.delete(scopeId);
      lockDepthByScope.delete(scopeId);
    } else {
      lockDepthByScope.set(scopeId, nextDepth);
    }
  }
}

export function resetReviewExecutionLocksForTests(): void {
  busyScopes.clear();
  scopeQueues.clear();
  lockDepthByScope.clear();
}
