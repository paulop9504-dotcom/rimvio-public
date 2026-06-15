/**
 * System Stability Layer — stable real-time cognitive OS.
 * @see docs/RIMVIO_SYSTEM_STABILITY_V1_REPORT.md
 */
export {
  STABILITY_CONTRACT_VERSION,
  DEFAULT_LOOP_STABILITY_CONFIG,
  type SystemLoadLevel,
  type LoopStabilityConfig,
  type AdaptiveBehavior,
  type StabilityControlFlags,
  type LoopSwitchRecord,
} from "@/lib/stability/stability-contract";

export {
  pushSignalThroughDebouncer,
  debounceSignalBatch,
  flushDebouncedSignals,
  flushAllDebouncedSignals,
  readDebouncerBucketCount,
  resetSignalDebouncerForTests,
  DEFAULT_DEBOUNCER_CONFIG,
  type DebouncerConfig,
} from "@/lib/stability/signal-debouncer";

export {
  applyLoopStabilityGuard,
  applyLoopStabilityGuardSimple,
  createLoopGuardState,
  type LoopGuardState,
  type LoopStabilityGuardResult,
} from "@/lib/stability/loop-stability-guard";

export {
  shouldCommitSurfaceFrame,
  commitSurfaceFrameKey,
  flushPendingSurfaceCommit,
  applyStabilityToSurfaces,
  buildStabilizedCompositionFrame,
  countSurfaceKeyChanges,
  resetSurfaceFlutterProtectionForTests,
  DEFAULT_FLUTTER_CONFIG,
} from "@/lib/stability/surface-flutter-protection";

export {
  recordSignalIngest,
  recordSignalIngestBatch,
  recordLoopSwitch,
  recordSurfaceRecompose,
  computeLoadMetrics,
  resolveLoadLevel,
  resetSystemLoadControllerForTests,
  type LoadMetrics,
} from "@/lib/stability/system-load-controller";

export { resolveAdaptiveBehavior } from "@/lib/stability/adaptive-resolution-engine";

export {
  readLoopGuardState,
  writeLoopGuardState,
  readStabilityControlFlags,
  readStabilityFrame,
  commitStabilityFrame,
  resetStabilityStateForTests,
  type StabilityFrame,
} from "@/lib/stability/stability-state-store";

export {
  processStableRealtimeTick,
  resetStabilityPipelineForTests,
  type StableRealtimeTickInput,
  type StableRealtimeTickResult,
} from "@/lib/stability/stability-pipeline";

export {
  replayStabilityStream,
  type ReplayStep,
} from "@/lib/stability/deterministic-replay";
