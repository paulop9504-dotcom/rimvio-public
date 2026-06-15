/**
 * Realtime Behavioral OS — continuous signal stream → loop → surface override.
 * @see docs/RIMVIO_REALTIME_BEHAVIORAL_OS_V1_REPORT.md
 */
export {
  REALTIME_CONTRACT_VERSION,
  DEFAULT_REALTIME_STABILITY,
  type StreamSignal,
  type StreamSignalKind,
  type UserActivityState,
  type RealtimeState,
  type RealtimeSurfaceFrame,
  type RealtimeStabilityConfig,
} from "@/lib/realtime/realtime-contract";

export {
  EVENT_REALTIME_UPDATED,
  emitRealtimeUpdated,
} from "@/lib/realtime/realtime-events";

export {
  SIGNAL_DECAY_HALF_LIFE_MS,
  decayedStrength,
  computeSignalVelocity,
} from "@/lib/realtime/signal-decay";

export {
  ingestStreamSignal,
  ingestStreamSignals,
  readStreamBuffer,
  projectStreamToWiringInput,
  readSignalVelocity,
  readRecentStreamSignals,
  resetStreamBufferForTests,
  type StreamBufferEntry,
} from "@/lib/realtime/signal-stream-engine";

export {
  collectDeviceSignals,
  resetDeviceSignalAdapterForTests,
  type DeviceAdapterInput,
  type DeviceAdapterSnapshot,
} from "@/lib/realtime/device-signal-adapter";

export {
  applyLoopStabilityGuard,
  type StabilityGuardResult,
} from "@/lib/realtime/loop-stability-guard";

export {
  applyLoopSurfaceBias,
  applyLoopSurfaceOverride,
  buildRealtimeSurfaceFrame,
  type LoopSurfaceOverrideResult,
} from "@/lib/realtime/loop-to-surface-override";

export {
  processRealtimeTick,
  pushRealtimeSignal,
  resetRealtimeOrchestratorForTests,
  type RealtimeTickInput,
  type RealtimeTickResult,
} from "@/lib/realtime/realtime-loop-orchestrator";

export {
  readRealtimeState,
  commitRealtimeState,
  resetRealtimeStateStoreForTests,
} from "@/lib/realtime/realtime-state-store";
