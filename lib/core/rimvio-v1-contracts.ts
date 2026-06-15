/**
 * Rimvio v1 frozen public contracts.
 * Breaking changes require RIMVIO_CORE_API_VERSION bump + release tag.
 */
export const RIMVIO_CORE_API_VERSION = "1.0.0-rimvio-alpha" as const;

export {
  EXECUTION_CONTRACT_VERSION,
  type ExecutionResult,
  type ExecutionRecord,
  type ExecutionStatus,
} from "@/lib/execution/execution-contract";

export {
  SURFACE_MEMORY_VERSION,
  type SurfaceMemoryEvent as MemoryEvent,
  type SurfaceMemorySnapshot,
} from "@/lib/memory/surface-memory-contract";

export {
  SURFACE_CONTRACT_VERSION,
  type Surface as SurfaceState,
  type SurfaceAction as ActionEvent,
  type SurfaceBuildContext,
  type SurfaceUxState,
} from "@/lib/surface-engine/surface-contract";

export { LOOP_WIRING_CONTRACT_VERSION } from "@/lib/loop-wiring/loop-contract";
