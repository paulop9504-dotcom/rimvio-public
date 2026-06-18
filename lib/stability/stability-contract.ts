import type { LoopType } from "@/lib/loop-wiring/loop-contract";

export const STABILITY_CONTRACT_VERSION = 1 as const;

export type SystemLoadLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type LoopStabilityConfig = {
  minHoldMs: number;
  hysteresisDelta: number;
  loopCooldownMs: number;
  oscillationWindowMs: number;
};

export const DEFAULT_LOOP_STABILITY_CONFIG: LoopStabilityConfig = {
  minHoldMs: 8000,
  hysteresisDelta: 0.15,
  loopCooldownMs: 5000,
  oscillationWindowMs: 20_000,
};

export type AdaptiveBehavior = {
  level: SystemLoadLevel;
  tickBatchMs: number;
  freezeLoopSwitching: boolean;
  learningPaused: boolean;
  primarySurfaceOnly: boolean;
  staticPrimaryOnly: boolean;
};

export type StabilityControlFlags = {
  level: SystemLoadLevel;
  learningPaused: boolean;
  freezeLoopSwitching: boolean;
  primarySurfaceOnly: boolean;
  staticPrimaryOnly: boolean;
  surfaceCommitLocked: boolean;
};

export type LoopSwitchRecord = {
  from: LoopType | null;
  to: LoopType;
  atMs: number;
};
