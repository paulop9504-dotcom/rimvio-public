/**
 * INTERNAL — sole import site for Rimvio core engines from the platform layer.
 * External plugins must not import this module.
 */
import { assertCatalogCompleteness, dispatchCapability } from "@/lib/capability-registry";
import type {
  CapabilityDispatchRequest,
  CapabilityDispatchResult,
} from "@/lib/capability-registry/capability-contract";
import { readRealtimeState } from "@/lib/realtime/realtime-state-store";
import {
  processRealtimeTick,
  pushRealtimeSignal,
  resetRealtimeOrchestratorForTests,
} from "@/lib/realtime/realtime-loop-orchestrator";
import type { DeviceAdapterInput } from "@/lib/realtime/device-signal-adapter";
import {
  processStableRealtimeTick,
  resetStabilityPipelineForTests,
} from "@/lib/stability/stability-pipeline";
import type { StreamSignal } from "@/lib/realtime/realtime-contract";
import { readStabilityControlFlags, readStabilityFrame } from "@/lib/stability/stability-state-store";
import { buildRealtimeSurfaceFrame } from "@/lib/realtime/loop-to-surface-override";
import type { SurfaceEngineResult } from "@/lib/surface-engine/surface-contract";
import type { RankedSurface } from "@/lib/surface-engine/surface-contract";
import { SURFACE_CONTRACT_VERSION } from "@/lib/surface-engine/surface-contract";
import { LOOP_WIRING_CONTRACT_VERSION } from "@/lib/loop-wiring/loop-contract";
import { REALTIME_CONTRACT_VERSION } from "@/lib/realtime/realtime-contract";
import { STABILITY_CONTRACT_VERSION } from "@/lib/stability/stability-contract";
import {
  readHostRuntimeVersion,
  isPlatformBootstrapped,
} from "@/lib/platform/platform-state-store";
import type {
  PlatformActiveContext,
  PlatformSurfaceEvent,
} from "@/lib/platform/platform-contract";

export type EngineBridgeSnapshot = {
  surfaceContractVersion: number;
  loopContractVersion: number;
  realtimeContractVersion: number;
  stabilityContractVersion: number;
};

export function readEngineContractSnapshot(): EngineBridgeSnapshot {
  return {
    surfaceContractVersion: SURFACE_CONTRACT_VERSION,
    loopContractVersion: LOOP_WIRING_CONTRACT_VERSION,
    realtimeContractVersion: REALTIME_CONTRACT_VERSION,
    stabilityContractVersion: STABILITY_CONTRACT_VERSION,
  };
}

export function bridgeAssertCapabilityCatalog(): void {
  assertCatalogCompleteness();
}

export function bridgeDispatchCapability(request: {
  capabilityId: string;
  inputs?: Record<string, string>;
  surfaceId?: string;
  eventId?: string;
  platform?: CapabilityDispatchRequest["platform"];
  providerId?: CapabilityDispatchRequest["providerId"];
}): CapabilityDispatchResult {
  return dispatchCapability(request as CapabilityDispatchRequest);
}

export function bridgeReadRealtimeState() {
  return readRealtimeState();
}

export function bridgeReadStabilityFlags() {
  return readStabilityControlFlags();
}

export function bridgeReadStabilityFrame() {
  return readStabilityFrame();
}

export function bridgeProcessRealtimeTick(input: {
  device?: DeviceAdapterInput;
  engine?: SurfaceEngineResult;
  channelSurfaces?: readonly RankedSurface[];
  now?: Date;
}) {
  return processRealtimeTick(input);
}

export function bridgeProcessStableTick(input: {
  streamSignals: readonly StreamSignal[];
  device?: DeviceAdapterInput;
  engine?: SurfaceEngineResult;
  channelSurfaces?: readonly RankedSurface[];
  now?: Date;
}) {
  const device = input.device;
  return processStableRealtimeTick({
    streamSignals: input.streamSignals,
    wiring: device ? { now: input.now } : undefined,
    now: input.now,
    previous: readRealtimeState(),
    userActivityState: "active",
    engine: input.engine,
    channelSurfaces: input.channelSurfaces,
  });
}

export function bridgePushRealtimeSignal(
  signal: StreamSignal | import("@/lib/platform/platform-contract").PlatformSignal,
  input?: Parameters<typeof processRealtimeTick>[0],
) {
  return pushRealtimeSignal(signal as StreamSignal, input);
}

export function bridgeBuildRealtimeSurfaceFrame(
  engine: SurfaceEngineResult,
  channelSurfaces: readonly RankedSurface[],
) {
  const realtime = readRealtimeState();
  if (!realtime) {
    return null;
  }
  return buildRealtimeSurfaceFrame(engine, channelSurfaces, realtime);
}

export function bridgeBuildContextFromEngine(
  engine?: unknown,
  channelSurfaces?: readonly unknown[],
): PlatformActiveContext {
  const runtimeVersion = isPlatformBootstrapped() ? readHostRuntimeVersion() : "v2";
  const realtime = readRealtimeState();
  const stability = bridgeReadStabilityFlags();
  const frame =
    engine && channelSurfaces
      ? bridgeBuildRealtimeSurfaceFrame(
          engine as SurfaceEngineResult,
          channelSurfaces as readonly RankedSurface[],
        )
      : null;

  return {
    apiVersion: 1,
    runtimeVersion,
    dominantLoop: realtime?.activeLoop?.loopType ?? null,
    loopStabilityScore: realtime?.loopStabilityScore ?? 0,
    systemLoadLevel: realtime?.systemLoadLevel ?? stability.level,
    primarySurfaceId: frame?.composition.layout.primary?.id ?? null,
    surfaceCount:
      (frame?.composition.layout.primary ? 1 : 0) +
      (frame?.composition.collapse.latentSurfaceIds.length ?? 0),
    learningPaused: realtime?.learningPaused ?? stability.learningPaused,
    computedAt: realtime?.computedAt ?? new Date().toISOString(),
  };
}

export function bridgeStreamSurfaceEvents(
  engine: unknown,
  channelSurfaces: readonly unknown[],
): PlatformSurfaceEvent | null {
  const frame = bridgeBuildRealtimeSurfaceFrame(
    engine as SurfaceEngineResult,
    channelSurfaces as readonly RankedSurface[],
  );
  if (!frame) {
    return null;
  }
  return {
    kind: "surface_frame",
    compositionKey:
      frame.realtime.surfaceOverrideKey ?? frame.composition.layout.primary?.id ?? "none",
    primarySurfaceId: frame.composition.layout.primary?.id ?? null,
    secondarySurfaceIds: [...frame.composition.collapse.latentSurfaceIds],
    computedAt: frame.composition.engine.computedAt,
  };
}

export function bridgeResetEnginesForTests(): void {
  resetRealtimeOrchestratorForTests();
  resetStabilityPipelineForTests();
}
