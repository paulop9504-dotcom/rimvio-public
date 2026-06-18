"use client";

import { useEffect, useMemo, useState } from "react";
import { EVENT_REALTIME_UPDATED } from "@/lib/realtime/realtime-events";
import {
  buildRealtimeSurfaceFrame,
  processRealtimeTick,
  readRealtimeState,
  type DeviceAdapterInput,
} from "@/lib/realtime";
import { readStabilityControlFlags, resolveAdaptiveBehavior, computeLoadMetrics } from "@/lib/stability";
import {
  bootstrapRimvioRuntime,
  assertRuntimeReady,
  publishPlatformFrame,
} from "@/lib/platform/rimvio-platform";
import { useSurfaceComposition, type UseSurfaceEngineInput } from "@/hooks/use-surface-composition";

const DEFAULT_TICK_MS = 2000;

/**
 * Continuous behavioral composition — loop bias overrides surface graph in real time.
 */
export function useRealtimeSurfaceComposition(
  engineInput: UseSurfaceEngineInput = {},
  deviceInput: DeviceAdapterInput = {},
) {
  const base = useSurfaceComposition(engineInput);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    bootstrapRimvioRuntime({ resetForTests: false });
    const run = () => {
      try {
        assertRuntimeReady();
      } catch {
        return;
      }
      processRealtimeTick({
        device: { ...deviceInput, now: new Date() },
        engine: base.result,
        channelSurfaces: base.feed,
        emitUiEvent: true,
      });
      publishPlatformFrame(base.result, base.feed);
      setTick((value) => value + 1);
    };
    run();
    const behavior = resolveAdaptiveBehavior(computeLoadMetrics());
    const tickMs = Math.max(500, DEFAULT_TICK_MS + behavior.tickBatchMs);
    const interval = window.setInterval(run, tickMs);
    const onRealtime = () => setTick((value) => value + 1);
    window.addEventListener(EVENT_REALTIME_UPDATED, onRealtime);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(EVENT_REALTIME_UPDATED, onRealtime);
    };
  }, [
    base.result.computedAt,
    base.feed.length,
    deviceInput.idleMinutes,
    deviceInput.isForeground,
    deviceInput.notificationCountLast15Min,
  ]);

  const realtimeFrame = useMemo(() => {
    void tick;
    const state = readRealtimeState();
    if (!state) {
      return buildRealtimeSurfaceFrame(base.result, base.feed, {
        contractVersion: 1,
        computedAt: base.result.computedAt,
        activeLoop: null,
        lastSignals: [],
        signalVelocity: 0,
        userActivityState: "active",
        loopStabilityScore: 0,
        lastLoopSwitchAt: null,
        wiring: {
          contractVersion: 1,
          computedAt: base.result.computedAt,
          candidates: [],
          activeLoop: null,
          suppressedLoops: [],
        },
        surfaceOverrideKey: null,
      });
    }
    return buildRealtimeSurfaceFrame(base.result, base.feed, state);
  }, [tick, base.result, base.feed]);

  return {
    ...base,
    frame: realtimeFrame.composition,
    layout: realtimeFrame.composition.layout,
    graph: realtimeFrame.composition.graph,
    realtime: realtimeFrame.realtime,
    dominantLoop: realtimeFrame.dominantLoop,
    overrideApplied: realtimeFrame.overrideApplied,
    compositionKey: realtimeFrame.realtime.surfaceOverrideKey ?? base.compositionKey,
    systemLoadLevel: realtimeFrame.realtime.systemLoadLevel ?? readStabilityControlFlags().level,
    learningPaused: realtimeFrame.realtime.learningPaused ?? false,
  };
}
