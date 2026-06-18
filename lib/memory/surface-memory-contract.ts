import type { CapabilityId } from "@/lib/capability-registry/capability-types";

export const SURFACE_MEMORY_VERSION = 1 as const;

export const SURFACE_MEMORY_UPDATED_EVENT = "rimvio:surface-memory-updated" as const;

export type SurfaceMemoryEventType = "completed" | "dismissed";

export type SurfaceMemoryEvent = {
  type: SurfaceMemoryEventType;
  surfaceId: string;
  capabilityId?: CapabilityId;
  actionKey: string;
  executionId?: string;
  at: string;
};

export type SurfaceMemorySnapshot = {
  version: typeof SURFACE_MEMORY_VERSION;
  completedActionIds: string[];
  dismissedSurfaceIds: string[];
  events: SurfaceMemoryEvent[];
  updatedAt: string;
};

export const EMPTY_SURFACE_MEMORY: SurfaceMemorySnapshot = {
  version: SURFACE_MEMORY_VERSION,
  completedActionIds: [],
  dismissedSurfaceIds: [],
  events: [],
  updatedAt: new Date(0).toISOString(),
};
