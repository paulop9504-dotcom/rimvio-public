import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { ExecutionRecord } from "@/lib/execution/execution-contract";
import type { SurfaceMemoryEvent } from "@/lib/memory/surface-memory-contract";
import {
  SURFACE_MEMORY_UPDATED_EVENT,
} from "@/lib/memory/surface-memory-contract";
import {
  appendSurfaceMemoryEvent,
  diffSurfaceMemorySnapshots,
  readSurfaceMemorySnapshot,
} from "@/lib/memory/surface-memory-store";

export function buildSurfaceActionKey(
  surfaceId: string,
  capabilityId: CapabilityId,
): string {
  return `${surfaceId}:${capabilityId}`;
}

function logMemoryCommit(event: SurfaceMemoryEvent): void {
  if (typeof console !== "undefined") {
    console.debug("[Rimvio] MEMORY_COMMIT_EVENT", event);
  }
}

function logMemoryDiff(
  before: ReturnType<typeof readSurfaceMemorySnapshot>,
  after: ReturnType<typeof readSurfaceMemorySnapshot>,
): void {
  const diff = diffSurfaceMemorySnapshots(before, after);
  if (
    diff.completedAdded.length === 0 &&
    diff.dismissedAdded.length === 0 &&
    diff.completedRemoved.length === 0 &&
    diff.dismissedRemoved.length === 0
  ) {
    return;
  }
  if (typeof console !== "undefined") {
    console.debug("[Rimvio] SURFACE_MEMORY_STATE_DIFF", diff);
  }
}

function emitMemoryUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SURFACE_MEMORY_UPDATED_EVENT));
  }
}

function commitMemoryEvent(event: SurfaceMemoryEvent): void {
  const before = readSurfaceMemorySnapshot();
  appendSurfaceMemoryEvent(event);
  const after = readSurfaceMemorySnapshot();
  logMemoryCommit(event);
  logMemoryDiff(before, after);
  emitMemoryUpdated();
}

/** User finished a capability step on a surface. */
export function onActionCompleted(input: {
  surfaceId: string;
  capabilityId: CapabilityId;
  executionId?: string;
  at?: string;
}): void {
  const at = input.at ?? new Date().toISOString();
  const actionKey = buildSurfaceActionKey(input.surfaceId, input.capabilityId);
  commitMemoryEvent({
    type: "completed",
    surfaceId: input.surfaceId,
    capabilityId: input.capabilityId,
    actionKey,
    executionId: input.executionId,
    at,
  });
}

/** User dismissed a surface (나중에). */
export function onActionDismissed(input: {
  surfaceId: string;
  capabilityId?: CapabilityId;
  executionId?: string;
  at?: string;
}): void {
  const at = input.at ?? new Date().toISOString();
  const capabilityId = input.capabilityId ?? ("DISMISS_SURFACE" as CapabilityId);
  commitMemoryEvent({
    type: "dismissed",
    surfaceId: input.surfaceId,
    capabilityId,
    actionKey: buildSurfaceActionKey(input.surfaceId, capabilityId),
    executionId: input.executionId,
    at,
  });
}

/** Execution terminal success → surface memory (write path). */
export function commitSurfaceMemoryFromExecution(record: ExecutionRecord): void {
  if (record.status !== "completed") {
    return;
  }

  const surfaceId = record.metadata?.surfaceId?.trim();
  if (!surfaceId) {
    return;
  }

  const capabilityId = record.capabilityId;
  if (capabilityId === "DISMISS_SURFACE") {
    onActionDismissed({
      surfaceId,
      capabilityId,
      executionId: record.executionId,
      at: record.completedAt,
    });
    return;
  }

  onActionCompleted({
    surfaceId,
    capabilityId,
    executionId: record.executionId,
    at: record.completedAt,
  });
}

export function readSurfaceMemoryContext(): {
  completedActionIds: readonly string[];
  dismissedSurfaceIds: readonly string[];
} {
  const snapshot = readSurfaceMemorySnapshot();
  return {
    completedActionIds: snapshot.completedActionIds,
    dismissedSurfaceIds: snapshot.dismissedSurfaceIds,
  };
}
