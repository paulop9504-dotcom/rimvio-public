import { resolvePluginCapability, getPlugin } from "@/lib/platform/extension-registry";
import {
  bridgeBuildContextFromEngine,
  bridgeDispatchCapability,
  bridgePushRealtimeSignal,
  bridgeReadRealtimeState,
  bridgeReadStabilityFlags,
  bridgeStreamSurfaceEvents,
} from "@/lib/platform/internal/engine-bridge";
import type {
  PlatformActiveContext,
  PlatformCapabilityRequest,
  PlatformDispatchResult,
  PlatformStreamEvent,
  PlatformSignal,
  SurfaceSubscription,
  LoopObserver,
} from "@/lib/platform/platform-contract";
import { assertRuntimeReady, readRuntimeVersion } from "@/lib/platform/rimvio-runtime";
import {
  commitPlatformContext,
  publishLoopEvent,
  publishSurfaceEvent,
  readPlatformContext,
  subscribeLoopEvents,
  subscribeSurfaceEvents,
} from "@/lib/platform/platform-state-store";
import { isRuntimeCompatible, resolveRuntimeFeatures } from "@/lib/platform/versioned-runtime";

export function getActiveContext(
  engine?: unknown,
  channelSurfaces?: readonly unknown[],
): PlatformActiveContext {
  assertRuntimeReady();
  const context = bridgeBuildContextFromEngine(engine, channelSurfaces);
  commitPlatformContext(context);
  return context;
}

export function observeLoopState(onEvent: (event: PlatformStreamEvent) => void): LoopObserver {
  assertRuntimeReady();
  const features = resolveRuntimeFeatures(readRuntimeVersion());
  if (!features.observeLoopState) {
    return { unsubscribe: () => {} };
  }

  const realtime = bridgeReadRealtimeState();
  if (realtime?.activeLoop) {
    onEvent({
      kind: "loop_state",
      activeLoop: realtime.activeLoop.loopType,
      confidenceScore: realtime.activeLoop.confidenceScore,
      computedAt: realtime.computedAt,
    });
  }

  const unsubscribe = subscribeLoopEvents(onEvent);
  return { unsubscribe };
}

export function subscribeSurface(onEvent: (event: PlatformStreamEvent) => void): SurfaceSubscription {
  assertRuntimeReady();
  const unsubscribe = subscribeSurfaceEvents(onEvent);
  return { unsubscribe };
}

export function* streamSurfaces(
  engine: unknown,
  channelSurfaces: readonly unknown[],
): Generator<PlatformStreamEvent, void, unknown> {
  assertRuntimeReady();
  const features = resolveRuntimeFeatures(readRuntimeVersion());
  if (!features.streamSurfaces) {
    return;
  }

  const event = bridgeStreamSurfaceEvents(engine, channelSurfaces);
  if (!event) {
    return;
  }
  publishSurfaceEvent(event);
  yield event;
}

export function dispatchCapability(
  request: PlatformCapabilityRequest,
): PlatformDispatchResult {
  assertRuntimeReady();

  if (stabilityBlocksDispatch()) {
    return { ok: false, reason: "stability_degraded", capabilityId: request.capabilityId, source: "core" };
  }

  const pluginResolved = resolvePluginCapability(request.capabilityId);
  if (pluginResolved) {
    const hostRuntime = readRuntimeVersion();
    if (!isRuntimeCompatible(pluginResolved.plugin.manifest.runtimeVersion, hostRuntime)) {
      return {
        ok: false,
        reason: "plugin_runtime_incompatible",
        capabilityId: request.capabilityId,
        source: "plugin",
      };
    }
    const handler = pluginResolved.plugin.capabilityHandler;
    if (!handler) {
      return { ok: false, reason: "plugin_handler_missing", capabilityId: request.capabilityId, source: "plugin" };
    }
    const mapped = handler(request.inputs ?? {});
    if (!mapped) {
      return { ok: false, reason: "plugin_dispatch_rejected", capabilityId: request.capabilityId, source: "plugin" };
    }
    const result = bridgeDispatchCapability({
      capabilityId: mapped.capabilityId,
      inputs: mapped.inputs ?? request.inputs,
      surfaceId: mapped.surfaceId ?? request.surfaceId,
      eventId: mapped.eventId ?? request.eventId,
      platform: request.platform,
      providerId: request.providerId,
    });
    return { ...result, source: "plugin" };
  }

  const result = bridgeDispatchCapability(request);
  return { ...result, source: "core" };
}

export function emitPluginSignal(
  pluginId: string,
  signal: PlatformSignal,
): { ok: boolean; reason?: string } {
  assertRuntimeReady();
  const plugin = getPlugin(pluginId);
  if (!plugin) {
    return { ok: false, reason: "unknown_plugin" };
  }
  if (!plugin.manifest.permissions.includes("emit_signal")) {
    return { ok: false, reason: "permission_denied" };
  }
  if (bridgeReadStabilityFlags().freezeLoopSwitching && bridgeReadStabilityFlags().learningPaused) {
    return { ok: false, reason: "stability_frozen" };
  }
  bridgePushRealtimeSignal(signal);
  return { ok: true };
}

export function publishPlatformFrame(
  engine: unknown,
  channelSurfaces: readonly unknown[],
): PlatformActiveContext {
  const context = getActiveContext(engine, channelSurfaces);
  for (const event of streamSurfaces(engine, channelSurfaces)) {
    void event;
  }
  const realtime = bridgeReadRealtimeState();
  if (realtime?.activeLoop) {
    publishLoopEvent({
      kind: "loop_state",
      activeLoop: realtime.activeLoop.loopType,
      confidenceScore: realtime.activeLoop.confidenceScore,
      computedAt: realtime.computedAt,
    });
  }
  return context;
}

function stabilityBlocksDispatch(): boolean {
  const flags = bridgeReadStabilityFlags();
  return flags.staticPrimaryOnly && flags.freezeLoopSwitching;
}

export function readPublicPlatformContext(): PlatformActiveContext | null {
  return readPlatformContext();
}
