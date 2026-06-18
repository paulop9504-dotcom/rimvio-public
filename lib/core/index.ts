/**
 * Rimvio OS core — execution, loops, memory, capabilities, learning, stability.
 * Production-stable v1 modules only (see docs/RIMVIO_RELEASE_V1_MANIFEST.md).
 */
export * from "@/lib/core/rimvio-v1-contracts";

export {
  enqueueExecution,
  markExecutionComplete,
  markExecutionFailed,
  runExecutionJob,
} from "@/lib/execution";

export {
  commitSurfaceMemoryFromExecution,
  onActionCompleted,
  onActionDismissed,
  readSurfaceMemoryContext,
} from "@/lib/memory";

export { wireLoopFromCapabilityExecution, selectActiveLoop } from "@/lib/loop-wiring";

export { resolveSurfaces, buildSurfacesFromLife } from "@/lib/surface-engine";

export { ingestExecutionOutcome } from "@/lib/learning";

export {
  expandSynapse,
  strengthenSynapse,
  weakenSynapse,
  pruneSynapse,
  getSynapticPriorityBoost,
  readSynapseSnapshot,
} from "@/lib/synaptic";

export { processStableRealtimeTick, readStabilityControlFlags } from "@/lib/stability";

export { dispatchCapability } from "@/lib/capability-registry";
