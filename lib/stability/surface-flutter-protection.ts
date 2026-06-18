import type { SurfaceCompositionFrame } from "@/lib/surface-composition/surface-node-contract";
import type { RankedSurface, SurfaceEngineResult } from "@/lib/surface-engine/surface-contract";
import type { AdaptiveBehavior } from "@/lib/stability/stability-contract";
import { composeSurfaceFrame } from "@/lib/surface-composition/compose-surface-frame";

export type FlutterProtectionConfig = {
  minCommitIntervalMs: number;
};

export const DEFAULT_FLUTTER_CONFIG: FlutterProtectionConfig = {
  minCommitIntervalMs: 16,
};

let lastCommitKey: string | null = null;
let lastCommitAtMs = 0;
let pendingCommitKey: string | null = null;
let renderLockUntilMs = 0;

/**
 * Frame-aligned surface commits — prevents re-render loops.
 */
export function shouldCommitSurfaceFrame(
  frameKey: string,
  nowMs: number,
  config: FlutterProtectionConfig = DEFAULT_FLUTTER_CONFIG,
): boolean {
  if (nowMs < renderLockUntilMs) {
    pendingCommitKey = frameKey;
    return false;
  }
  if (frameKey === lastCommitKey) {
    return false;
  }
  const elapsed = nowMs - lastCommitAtMs;
  if (elapsed < config.minCommitIntervalMs && lastCommitKey !== null) {
    pendingCommitKey = frameKey;
    return false;
  }
  return true;
}

export function commitSurfaceFrameKey(frameKey: string, nowMs: number): void {
  lastCommitKey = frameKey;
  lastCommitAtMs = nowMs;
  pendingCommitKey = null;
  renderLockUntilMs = nowMs + DEFAULT_FLUTTER_CONFIG.minCommitIntervalMs;
}

export function flushPendingSurfaceCommit(nowMs: number): string | null {
  if (nowMs < renderLockUntilMs || !pendingCommitKey) {
    return null;
  }
  const key = pendingCommitKey;
  commitSurfaceFrameKey(key, nowMs);
  return key;
}

/** Strip secondaries / avoid partial recomposition under load. */
export function applyStabilityToSurfaces(
  surfaces: readonly RankedSurface[],
  behavior: AdaptiveBehavior,
): readonly RankedSurface[] {
  if (behavior.staticPrimaryOnly || behavior.primarySurfaceOnly) {
    const primary = surfaces[0];
    return primary ? [primary] : [];
  }
  if (behavior.level === "HIGH") {
    return surfaces.slice(0, 1);
  }
  if (behavior.level === "MEDIUM") {
    return surfaces.slice(0, 2);
  }
  return surfaces;
}

export function buildStabilizedCompositionFrame(
  engine: SurfaceEngineResult,
  surfaces: readonly RankedSurface[],
  behavior: AdaptiveBehavior,
): SurfaceCompositionFrame {
  const stableSurfaces = applyStabilityToSurfaces(surfaces, behavior);
  const uxState =
    behavior.staticPrimaryOnly || behavior.level === "CRITICAL"
      ? "overloaded"
      : behavior.level === "HIGH"
        ? "low_signal"
        : engine.uxState;
  return composeSurfaceFrame({ ...engine, uxState }, stableSurfaces);
}

export function countSurfaceKeyChanges(keys: readonly string[]): number {
  let changes = 0;
  for (let index = 1; index < keys.length; index += 1) {
    if (keys[index] !== keys[index - 1]) {
      changes += 1;
    }
  }
  return changes;
}

export function resetSurfaceFlutterProtectionForTests(): void {
  lastCommitKey = null;
  lastCommitAtMs = 0;
  pendingCommitKey = null;
  renderLockUntilMs = 0;
}
