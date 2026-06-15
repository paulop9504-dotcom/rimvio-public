import { wireKillerLoops } from "@/lib/loop-wiring/loop-wiring-engine";
import type { LoopWiringInput } from "@/lib/loop-wiring/loop-wiring-input";
import type { LoopCandidate } from "@/lib/loop-wiring/loop-contract";
import {
  ingestStreamSignals,
  projectStreamToWiringInput,
  readRecentStreamSignals,
  readSignalVelocity,
} from "@/lib/realtime/signal-stream-engine";
import type { StreamSignal } from "@/lib/realtime/realtime-contract";
import { applyLoopSurfaceOverride } from "@/lib/realtime/loop-to-surface-override";
import type { RealtimeState } from "@/lib/realtime/realtime-contract";
import { REALTIME_CONTRACT_VERSION } from "@/lib/realtime/realtime-contract";
import { resolveAdaptiveBehavior } from "@/lib/stability/adaptive-resolution-engine";
import { debounceSignalBatch } from "@/lib/stability/signal-debouncer";
import {
  applyLoopStabilityGuard,
  createLoopGuardState,
} from "@/lib/stability/loop-stability-guard";
import {
  applyStabilityToSurfaces,
  buildStabilizedCompositionFrame,
  commitSurfaceFrameKey,
  shouldCommitSurfaceFrame,
} from "@/lib/stability/surface-flutter-protection";
import {
  computeLoadMetrics,
  recordLoopSwitch,
  recordSignalIngestBatch,
  recordSurfaceRecompose,
} from "@/lib/stability/system-load-controller";
import { resetSignalDebouncerForTests } from "@/lib/stability/signal-debouncer";
import { resetSystemLoadControllerForTests } from "@/lib/stability/system-load-controller";
import { resetSurfaceFlutterProtectionForTests } from "@/lib/stability/surface-flutter-protection";
import { resetStabilityStateForTests } from "@/lib/stability/stability-state-store";
import {
  commitStabilityFrame,
  readLoopGuardState,
  readStabilityControlFlags,
  writeStabilityControlFlags,
  type StabilityFrame,
} from "@/lib/stability/stability-state-store";
import type { SurfaceEngineResult } from "@/lib/surface-engine/surface-contract";
import type { RankedSurface } from "@/lib/surface-engine/surface-contract";
import type { SurfaceCompositionFrame } from "@/lib/surface-composition/surface-node-contract";

export type StableRealtimeTickInput = {
  streamSignals: readonly StreamSignal[];
  wiring?: LoopWiringInput;
  now?: Date;
  previous?: RealtimeState | null;
  userActivityState?: RealtimeState["userActivityState"];
  engine?: SurfaceEngineResult;
  channelSurfaces?: readonly RankedSurface[];
};

export type StableRealtimeTickResult = {
  state: RealtimeState;
  stability: StabilityFrame;
  composition: SurfaceCompositionFrame | null;
  latencyMs: number;
  loopSwitched: boolean;
  surfaceRecomposed: boolean;
  surfaceUpdateSuppressed: boolean;
};

export function processStableRealtimeTick(
  input: StableRealtimeTickInput,
): StableRealtimeTickResult {
  const started = performance.now();
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const previous = input.previous ?? null;

  recordSignalIngestBatch(input.streamSignals.length, nowMs);
  const debounced = debounceSignalBatch(input.streamSignals, nowMs);
  ingestStreamSignals(debounced, nowMs);

  const metrics = computeLoadMetrics(nowMs);
  const behavior = resolveAdaptiveBehavior(metrics, nowMs);
  writeStabilityControlFlags({
    level: behavior.level,
    learningPaused: behavior.learningPaused,
    freezeLoopSwitching: behavior.freezeLoopSwitching,
    primarySurfaceOnly: behavior.primarySurfaceOnly,
    staticPrimaryOnly: behavior.staticPrimaryOnly,
    surfaceCommitLocked: behavior.level === "HIGH" || behavior.level === "CRITICAL",
  });

  const projected = projectStreamToWiringInput(
    { ...input.wiring, now },
    now,
  );
  const wiringFrame = wireKillerLoops(projected);

  let guardState = readLoopGuardState();
  if (!previous?.activeLoop && guardState.activeLoopType === null) {
    guardState = createLoopGuardState(previous?.activeLoop ?? null, null);
  }

  const { result: stability, nextState: nextGuard } = applyLoopStabilityGuard(
    wiringFrame.activeLoop,
    previous?.activeLoop ?? null,
    guardState,
    nowMs,
  );

  let activeLoop: LoopCandidate | null = stability.activeLoop;
  let loopSwitched = stability.switched;

  if (behavior.freezeLoopSwitching && previous?.activeLoop) {
    activeLoop = previous.activeLoop;
    loopSwitched = false;
  }

  if (loopSwitched) {
    recordLoopSwitch(nowMs);
  }

  const lastLoopSwitchAt =
    loopSwitched && activeLoop
      ? now.toISOString()
      : previous?.lastLoopSwitchAt ?? null;

  let surfaceOverrideKey = previous?.surfaceOverrideKey ?? null;
  let composition: SurfaceCompositionFrame | null = null;
  let surfaceRecomposed = false;
  let surfaceUpdateSuppressed = false;

  if (input.engine && input.channelSurfaces) {
    const override = applyLoopSurfaceOverride(
      input.engine,
      input.channelSurfaces,
      activeLoop,
    );
    const stableSurfaces = applyStabilityToSurfaces(override.surfaces, behavior);
    const candidateFrame = buildStabilizedCompositionFrame(
      input.engine,
      stableSurfaces,
      behavior,
    );
    const frameKey = `${override.overrideKey}:${behavior.level}`;

    if (shouldCommitSurfaceFrame(frameKey, nowMs)) {
      commitSurfaceFrameKey(frameKey, nowMs);
      surfaceOverrideKey = frameKey;
      composition = candidateFrame;
      surfaceRecomposed =
        loopSwitched || previous?.surfaceOverrideKey !== frameKey;
      recordSurfaceRecompose(nowMs);
    } else {
      surfaceUpdateSuppressed = true;
      composition = null;
    }
  }

  const realtimeState: RealtimeState = {
    contractVersion: REALTIME_CONTRACT_VERSION,
    computedAt: now.toISOString(),
    activeLoop,
    lastSignals: readRecentStreamSignals(nowMs),
    signalVelocity: readSignalVelocity(nowMs),
    userActivityState: input.userActivityState ?? "active",
    loopStabilityScore: stability.loopStabilityScore,
    lastLoopSwitchAt,
    wiring: {
      ...wiringFrame,
      activeLoop,
      suppressedLoops: stability.suppressedParallel,
    },
    surfaceOverrideKey,
    systemLoadLevel: behavior.level,
    learningPaused: behavior.learningPaused,
    stabilityBlockedReason: stability.blockedReason,
  };

  const stabilityFrame: StabilityFrame = {
    contractVersion: 1,
    computedAt: now.toISOString(),
    loadLevel: behavior.level,
    metrics,
    flags: readStabilityControlFlags(),
    loopGuard: nextGuard,
    lastSurfaceCommitKey: surfaceOverrideKey,
    suppressedSurfaceUpdates: surfaceUpdateSuppressed ? 1 : 0,
  };
  commitStabilityFrame(stabilityFrame);

  return {
    state: realtimeState,
    stability: stabilityFrame,
    composition,
    latencyMs: performance.now() - started,
    loopSwitched,
    surfaceRecomposed,
    surfaceUpdateSuppressed,
  };
}

export function resetStabilityPipelineForTests(): void {
  resetSignalDebouncerForTests();
  resetSystemLoadControllerForTests();
  resetSurfaceFlutterProtectionForTests();
  resetStabilityStateForTests();
}
