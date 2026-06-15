import { commitEventLifecycle } from "@/lib/source-of-truth/commit-truth";

/** Undo a fast-commit schedule save — archives the event SSOT row. */
export function undoLensScheduleCommit(eventId: string): boolean {
  const normalized = eventId.trim();
  if (!normalized) {
    return false;
  }
  return commitEventLifecycle(normalized, "archived") !== null;
}
