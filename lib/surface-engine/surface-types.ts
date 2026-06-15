/**
 * Surface Engine — shared type aliases (UI-agnostic).
 * @see surface-contract.ts for canonical schema version.
 */
export type {
  Surface,
  SurfaceAction,
  CapabilityId,
  SurfaceChannel,
  SurfaceEventRef,
  SurfaceLifecycle,
  SurfaceNarration,
  SurfacePerson,
  SurfacePriority,
  SurfacePriorityBand,
  SurfaceResource,
  SurfaceResourceKind,
  SurfaceType,
  SurfaceVisibility,
  SurfaceBuildContext,
  SurfaceEngineResult,
  RankedSurface,
  SurfaceRouteMap,
} from "@/lib/surface-engine/surface-contract";

export const SURFACE_CONTRACT_VERSION = 1 as const;
