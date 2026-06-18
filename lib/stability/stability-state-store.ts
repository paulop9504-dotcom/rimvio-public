import type { LoopGuardState } from "@/lib/stability/loop-stability-guard";
import { createLoopGuardState } from "@/lib/stability/loop-stability-guard";
import type {
  StabilityControlFlags,
  SystemLoadLevel,
} from "@/lib/stability/stability-contract";
import type { LoadMetrics } from "@/lib/stability/system-load-controller";

export type StabilityFrame = {
  contractVersion: 1;
  computedAt: string;
  loadLevel: SystemLoadLevel;
  metrics: LoadMetrics;
  flags: StabilityControlFlags;
  loopGuard: LoopGuardState;
  lastSurfaceCommitKey: string | null;
  suppressedSurfaceUpdates: number;
};

let loopGuardState = createLoopGuardState();
let controlFlags: StabilityControlFlags = {
  level: "LOW",
  learningPaused: false,
  freezeLoopSwitching: false,
  primarySurfaceOnly: false,
  staticPrimaryOnly: false,
  surfaceCommitLocked: false,
};
let lastFrame: StabilityFrame | null = null;

export function readLoopGuardState(): LoopGuardState {
  return loopGuardState;
}

export function writeLoopGuardState(state: LoopGuardState): void {
  loopGuardState = state;
}

export function readStabilityControlFlags(): StabilityControlFlags {
  return controlFlags;
}

export function writeStabilityControlFlags(flags: StabilityControlFlags): void {
  controlFlags = flags;
}

export function readStabilityFrame(): StabilityFrame | null {
  return lastFrame;
}

export function commitStabilityFrame(frame: StabilityFrame): void {
  lastFrame = frame;
  loopGuardState = frame.loopGuard;
  controlFlags = frame.flags;
}

export function resetStabilityStateForTests(): void {
  loopGuardState = createLoopGuardState();
  controlFlags = {
    level: "LOW",
    learningPaused: false,
    freezeLoopSwitching: false,
    primarySurfaceOnly: false,
    staticPrimaryOnly: false,
    surfaceCommitLocked: false,
  };
  lastFrame = null;
}
