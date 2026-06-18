import type {
  SurfaceMemoryEvent,
  SurfaceMemorySnapshot,
} from "@/lib/memory/surface-memory-contract";
import {
  EMPTY_SURFACE_MEMORY,
  SURFACE_MEMORY_VERSION,
} from "@/lib/memory/surface-memory-contract";

const STORAGE_KEY = "rimvio.surface-memory.v1";
const MAX_EVENTS = 128;
const MAX_COMPLETED = 96;
const MAX_DISMISSED = 48;

let memoryCache: SurfaceMemorySnapshot | null = null;

function cloneSnapshot(snapshot: SurfaceMemorySnapshot): SurfaceMemorySnapshot {
  return {
    version: snapshot.version,
    completedActionIds: [...snapshot.completedActionIds],
    dismissedSurfaceIds: [...snapshot.dismissedSurfaceIds],
    events: snapshot.events.map((row) => ({ ...row })),
    updatedAt: snapshot.updatedAt,
  };
}

function readStorage(): SurfaceMemorySnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SurfaceMemorySnapshot;
    if (parsed.version !== SURFACE_MEMORY_VERSION) {
      return null;
    }
    return {
      version: SURFACE_MEMORY_VERSION,
      completedActionIds: [...(parsed.completedActionIds ?? [])],
      dismissedSurfaceIds: [...(parsed.dismissedSurfaceIds ?? [])],
      events: [...(parsed.events ?? [])],
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeStorage(snapshot: SurfaceMemorySnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

/** In-memory + localStorage snapshot (browser survives refresh). */
export function readSurfaceMemorySnapshot(): SurfaceMemorySnapshot {
  if (memoryCache) {
    return cloneSnapshot(memoryCache);
  }
  const stored = readStorage();
  if (stored) {
    memoryCache = stored;
    return cloneSnapshot(stored);
  }
  return cloneSnapshot(EMPTY_SURFACE_MEMORY);
}

export function writeSurfaceMemorySnapshot(snapshot: SurfaceMemorySnapshot): SurfaceMemorySnapshot {
  const next: SurfaceMemorySnapshot = {
    version: SURFACE_MEMORY_VERSION,
    completedActionIds: [...new Set(snapshot.completedActionIds)].slice(-MAX_COMPLETED),
    dismissedSurfaceIds: [...new Set(snapshot.dismissedSurfaceIds)].slice(-MAX_DISMISSED),
    events: snapshot.events.slice(-MAX_EVENTS),
    updatedAt: snapshot.updatedAt,
  };
  memoryCache = next;
  writeStorage(next);
  return cloneSnapshot(next);
}

export function appendSurfaceMemoryEvent(event: SurfaceMemoryEvent): SurfaceMemorySnapshot {
  const current = readSurfaceMemorySnapshot();
  const completed = new Set(current.completedActionIds);
  const dismissed = new Set(current.dismissedSurfaceIds);

  if (event.type === "completed") {
    completed.add(event.actionKey);
  } else {
    dismissed.add(event.surfaceId);
  }

  return writeSurfaceMemorySnapshot({
    version: SURFACE_MEMORY_VERSION,
    completedActionIds: [...completed],
    dismissedSurfaceIds: [...dismissed],
    events: [...current.events, event],
    updatedAt: event.at,
  });
}

export function resetSurfaceMemoryStoreForTests(): void {
  memoryCache = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function diffSurfaceMemorySnapshots(
  before: SurfaceMemorySnapshot,
  after: SurfaceMemorySnapshot,
): {
  completedAdded: string[];
  completedRemoved: string[];
  dismissedAdded: string[];
  dismissedRemoved: string[];
} {
  const beforeCompleted = new Set(before.completedActionIds);
  const afterCompleted = new Set(after.completedActionIds);
  const beforeDismissed = new Set(before.dismissedSurfaceIds);
  const afterDismissed = new Set(after.dismissedSurfaceIds);

  return {
    completedAdded: after.completedActionIds.filter((id) => !beforeCompleted.has(id)),
    completedRemoved: before.completedActionIds.filter((id) => !afterCompleted.has(id)),
    dismissedAdded: after.dismissedSurfaceIds.filter((id) => !beforeDismissed.has(id)),
    dismissedRemoved: before.dismissedSurfaceIds.filter((id) => !afterDismissed.has(id)),
  };
}
