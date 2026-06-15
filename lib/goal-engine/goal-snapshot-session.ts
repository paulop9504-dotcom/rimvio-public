import type { GoalSnapshot } from "@/lib/goal-engine/types";
import type { GoalSnapshotWire } from "@/lib/goal-engine/serialize-goal-snapshot-wire";

const STORAGE_PREFIX = "rimvio-goal-snapshot";
const memoryByScope = new Map<string, GoalSnapshot>();

function storageKey(scopeId: string): string {
  return `${STORAGE_PREFIX}:${scopeId}`;
}

/**
 * Client read model — snapshot is authored only by run-orchestrator-pipeline (server turn).
 * Dock and UI publish/read via this session; they must not call buildGoalSnapshot.
 */
export function publishGoalSnapshotFromTurn(
  scopeId: string,
  snapshot: GoalSnapshot | GoalSnapshotWire | null | undefined,
): void {
  if (!snapshot) {
    return;
  }
  memoryByScope.set(scopeId, snapshot);
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(storageKey(scopeId), JSON.stringify(snapshot));
  } catch {
    // private mode / quota
  }
}

/** Read-only revision id for master-context echo (§6) — client detects change only. */
export function readLastGoalSnapshotRevision(scopeId: string): string | null {
  return readLastGoalSnapshot(scopeId)?.sourceRevision ?? null;
}

/** Read-only — returns last turn snapshot for this chat scope. */
export function readLastGoalSnapshot(scopeId: string): GoalSnapshot | null {
  const cached = memoryByScope.get(scopeId);
  if (cached) {
    return cached;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(storageKey(scopeId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as GoalSnapshot;
    if (!parsed?.referenceDate || !parsed?.sourceRevision) {
      return null;
    }
    memoryByScope.set(scopeId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function resetGoalSnapshotSessionForTests(scopeId?: string): void {
  if (scopeId) {
    memoryByScope.delete(scopeId);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(storageKey(scopeId));
    }
    return;
  }
  memoryByScope.clear();
}
