import type { LoopWiringInput } from "@/lib/loop-wiring/loop-wiring-input";
import {
  collectDeviceSignals,
  type DeviceAdapterInput,
} from "@/lib/realtime/device-signal-adapter";
import { emitRealtimeUpdated } from "@/lib/realtime/realtime-events";
import {
  ingestStreamSignal,
  resetStreamBufferForTests,
} from "@/lib/realtime/signal-stream-engine";
import { resetDeviceSignalAdapterForTests } from "@/lib/realtime/device-signal-adapter";
import { resetRealtimeStateStoreForTests } from "@/lib/realtime/realtime-state-store";
import {
  REALTIME_CONTRACT_VERSION,
  type RealtimeState,
} from "@/lib/realtime/realtime-contract";
import { commitRealtimeState, readRealtimeState } from "@/lib/realtime/realtime-state-store";
import type { SurfaceEngineResult } from "@/lib/surface-engine/surface-contract";
import type { RankedSurface } from "@/lib/surface-engine/surface-contract";
import type { StreamSignal } from "@/lib/realtime/realtime-contract";
import { processStableRealtimeTick } from "@/lib/stability/stability-pipeline";
import { resetStabilityPipelineForTests } from "@/lib/stability/stability-pipeline";
import { readStabilityFrame } from "@/lib/stability/stability-state-store";

export type RealtimeTickInput = {
  device?: DeviceAdapterInput;
  wiring?: LoopWiringInput;
  now?: Date;
  /** When set, recompose surfaces with loop bias. */
  engine?: SurfaceEngineResult;
  channelSurfaces?: readonly RankedSurface[];
  emitUiEvent?: boolean;
};

export type RealtimeTickResult = {
  state: RealtimeState;
  latencyMs: number;
  loopSwitched: boolean;
  surfaceRecomposed: boolean;
  surfaceUpdateSuppressed?: boolean;
  systemLoadLevel?: RealtimeState["systemLoadLevel"];
};

/**
 * Stable continuous tick:
 * debouncer → loop wiring → stability guard → surface override → flutter protection.
 */
export function processRealtimeTick(input: RealtimeTickInput = {}): RealtimeTickResult {
  const now = input.now ?? new Date();
  const previous = readRealtimeState();
  const device = collectDeviceSignals({ ...input.device, now });

  const stable = processStableRealtimeTick({
    streamSignals: device.streamSignals,
    wiring: { ...device.wiring, ...input.wiring, now },
    now,
    previous,
    userActivityState: device.activityState,
    engine: input.engine,
    channelSurfaces: input.channelSurfaces,
  });

  commitRealtimeState(stable.state);

  if (
    input.emitUiEvent !== false &&
    (stable.loopSwitched || stable.surfaceRecomposed) &&
    !stable.surfaceUpdateSuppressed
  ) {
    emitRealtimeUpdated();
  }

  void readStabilityFrame();

  return {
    state: stable.state,
    latencyMs: stable.latencyMs,
    loopSwitched: stable.loopSwitched,
    surfaceRecomposed: stable.surfaceRecomposed,
    surfaceUpdateSuppressed: stable.surfaceUpdateSuppressed,
    systemLoadLevel: stable.state.systemLoadLevel,
  };
}

/** Push one stream signal and run stable tick immediately. */
export function pushRealtimeSignal(
  signal: StreamSignal,
  input: RealtimeTickInput = {},
): RealtimeTickResult {
  const now = input.now ?? new Date();
  ingestStreamSignal(signal, now.getTime());
  const device = collectDeviceSignals({ ...input.device, now });
  const stable = processStableRealtimeTick({
    streamSignals: [signal, ...device.streamSignals],
    wiring: { ...device.wiring, ...input.wiring, now },
    now,
    previous: readRealtimeState(),
    userActivityState: device.activityState,
    engine: input.engine,
    channelSurfaces: input.channelSurfaces,
  });
  commitRealtimeState(stable.state);
  if (input.emitUiEvent !== false && stable.surfaceRecomposed) {
    emitRealtimeUpdated();
  }
  return {
    state: stable.state,
    latencyMs: stable.latencyMs,
    loopSwitched: stable.loopSwitched,
    surfaceRecomposed: stable.surfaceRecomposed,
    surfaceUpdateSuppressed: stable.surfaceUpdateSuppressed,
    systemLoadLevel: stable.state.systemLoadLevel,
  };
}

export function resetRealtimeOrchestratorForTests(): void {
  resetStreamBufferForTests();
  resetDeviceSignalAdapterForTests();
  resetRealtimeStateStoreForTests();
  resetStabilityPipelineForTests();
}
