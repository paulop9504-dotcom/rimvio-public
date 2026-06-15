export {
  SURFACE_MEMORY_VERSION,
  SURFACE_MEMORY_UPDATED_EVENT,
  EMPTY_SURFACE_MEMORY,
  type SurfaceMemoryEvent,
  type SurfaceMemoryEventType,
  type SurfaceMemorySnapshot,
} from "@/lib/memory/surface-memory-contract";

export {
  readSurfaceMemorySnapshot,
  writeSurfaceMemorySnapshot,
  appendSurfaceMemoryEvent,
  resetSurfaceMemoryStoreForTests,
  diffSurfaceMemorySnapshots,
} from "@/lib/memory/surface-memory-store";

export {
  buildSurfaceActionKey,
  onActionCompleted,
  onActionDismissed,
  commitSurfaceMemoryFromExecution,
  readSurfaceMemoryContext,
} from "@/lib/memory/surface-memory-commit";
