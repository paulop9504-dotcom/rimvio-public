/**
 * Surface Engine v1 — transforms life-state into actionable surfaces.
 * @see docs/RIMVIO_SURFACE_ENGINE_V1_REPORT.md
 */
export {
  SURFACE_CONTRACT_VERSION,
  type Surface,
  type SurfaceAction,
  type SurfaceBuildContext,
  type SurfaceChannel,
  type SurfaceEngineResult,
  type SurfaceEventRef,
  type SurfaceLifecycle,
  type SurfaceNarration,
  type SurfacePerson,
  type SurfacePriority,
  type SurfacePriorityBand,
  type SurfaceResource,
  type SurfaceResourceKind,
  type SurfaceRouteMap,
  type SurfaceType,
  type SurfaceVisibility,
  type RankedSurface,
} from "@/lib/surface-engine/surface-contract";

export { buildSurfacesFromLife, selectPrimaryAction } from "@/lib/surface-engine/surface-builder";
export { rankSurfaces } from "@/lib/surface-engine/surface-ranker";
export { resolveSurfaces, type ResolveSurfacesInput } from "@/lib/surface-engine/surface-resolver";
export {
  stabilizeSurfaceLayer,
  assertStabilityInvariants,
  collapseOverloadedSurfaces,
  mergeLowSignalSurfaces,
  resolveSignalConflicts,
  type SurfaceStabilityResult,
} from "@/lib/surface-engine/surface-stability";
export {
  buildStartHereSurface,
  buildIdleStarterSurface,
  timeBasedFallbackDescription,
} from "@/lib/surface-engine/surface-fallback";
export {
  detectSurfaceUxState,
  UX_MAX_TOP_SURFACES,
  UX_OVERLOAD_THRESHOLD,
} from "@/lib/surface-engine/surface-ux-state";
export type { SurfaceUxState } from "@/lib/surface-engine/surface-contract";
export {
  routeSurfacesToChannels,
  selectSurfacesForChannel,
  type SurfaceRouterContext,
} from "@/lib/surface-engine/surface-router";
export {
  computeRawPriorityScore,
  hoursUntilEvent,
  lifecycleUrgencyWeight,
} from "@/lib/surface-engine/surface-priority";
export {
  surfacesToPredictiveDockWire,
  applyGoalBlendToDockWire,
} from "@/lib/surface-engine/adapters/surface-to-dock-wire";
export {
  surfacesToEventChips,
  surfacesToOverlayRows,
  buildCalendarSnapshotFromSurfaces,
} from "@/lib/surface-engine/adapters/surface-to-calendar";

export {
  FIXTURE_BUILD_CONTEXT,
  FIXTURE_CHICKEN_DINNER,
  FIXTURE_LIFE_PROJECTIONS,
  FIXTURE_OSAKA_TRAVEL,
  FIXTURE_REMINDER,
  FIXTURE_STARTUP_GOAL,
  FIXTURE_TRAVEL_AFTER_FLIGHT,
  FIXTURE_TRAVEL_AFTER_HOTEL,
} from "@/lib/surface-engine/surface-test-fixtures";
