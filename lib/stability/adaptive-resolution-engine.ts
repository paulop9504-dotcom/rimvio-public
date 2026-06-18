import type {
  AdaptiveBehavior,
  SystemLoadLevel,
} from "@/lib/stability/stability-contract";
import {
  computeLoadMetrics,
  resolveLoadLevel,
  type LoadMetrics,
} from "@/lib/stability/system-load-controller";

/**
 * Degrade gracefully under pressure — deterministic, no randomness.
 */
export function resolveAdaptiveBehavior(
  metrics?: LoadMetrics,
  nowMs = Date.now(),
): AdaptiveBehavior {
  const load = metrics ?? computeLoadMetrics(nowMs);
  const level = resolveLoadLevel(load);

  switch (level) {
    case "LOW":
      return {
        level,
        tickBatchMs: 0,
        freezeLoopSwitching: false,
        learningPaused: false,
        primarySurfaceOnly: false,
        staticPrimaryOnly: false,
      };
    case "MEDIUM":
      return {
        level,
        tickBatchMs: 250,
        freezeLoopSwitching: false,
        learningPaused: false,
        primarySurfaceOnly: false,
        staticPrimaryOnly: false,
      };
    case "HIGH":
      return {
        level,
        tickBatchMs: 500,
        freezeLoopSwitching: true,
        learningPaused: true,
        primarySurfaceOnly: true,
        staticPrimaryOnly: false,
      };
    case "CRITICAL":
      return {
        level,
        tickBatchMs: 1000,
        freezeLoopSwitching: true,
        learningPaused: true,
        primarySurfaceOnly: true,
        staticPrimaryOnly: true,
      };
  }
}
