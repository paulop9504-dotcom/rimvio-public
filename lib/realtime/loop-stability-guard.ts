import type { LoopCandidate } from "@/lib/loop-wiring/loop-contract";
import type { RealtimeStabilityConfig } from "@/lib/realtime/realtime-contract";
import { DEFAULT_REALTIME_STABILITY } from "@/lib/realtime/realtime-contract";
import {
  applyLoopStabilityGuardSimple,
  type LoopStabilityGuardResult,
} from "@/lib/stability/loop-stability-guard";

export type StabilityGuardResult = Omit<LoopStabilityGuardResult, "blockedReason"> & {
  blockedReason?: LoopStabilityGuardResult["blockedReason"];
};

/** @deprecated Prefer `applyLoopStabilityGuard` from `@/lib/stability`. */
export function applyLoopStabilityGuard(
  proposed: LoopCandidate | null,
  current: LoopCandidate | null,
  lastSwitchAtMs: number | null,
  nowMs: number,
  config: RealtimeStabilityConfig = DEFAULT_REALTIME_STABILITY,
): StabilityGuardResult {
  return applyLoopStabilityGuardSimple(
    proposed,
    current,
    lastSwitchAtMs,
    nowMs,
    config.minSwitchIntervalMs,
    config.scoreDeltaThreshold,
  );
}
