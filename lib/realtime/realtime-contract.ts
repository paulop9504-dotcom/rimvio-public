import type { LoopCandidate, LoopType } from "@/lib/loop-wiring/loop-contract";
import type { LoopWiringResult } from "@/lib/loop-wiring/loop-contract";
import type { SurfaceCompositionFrame } from "@/lib/surface-composition/surface-node-contract";
import type { SignalCategory } from "@/lib/loop-wiring/loop-contract";
import type { SystemLoadLevel } from "@/lib/stability/stability-contract";
import type { LoopStabilityGuardResult } from "@/lib/stability/loop-stability-guard";

export const REALTIME_CONTRACT_VERSION = 1 as const;

/** Device + behavior stream kinds (continuous ingestion). */
export type StreamSignalKind =
  | "app_foreground"
  | "app_background"
  | "touch_activity"
  | "screen_wake"
  | "screen_sleep"
  | "system_interrupt"
  | "notification_burst"
  | "message_burst"
  | "navigate_pulse"
  | "map_search_pulse"
  | "idle_tick"
  | "gps_movement_pulse"
  | "gps_stationary_pulse"
  | "home_location_pulse";

export type StreamSignal = {
  signalId: string;
  kind: StreamSignalKind;
  category: SignalCategory;
  timestamp: string;
  strength: number;
};

export type UserActivityState =
  | "active"
  | "idle"
  | "background"
  | "interrupted"
  | "transit";

export type RealtimeState = {
  contractVersion: typeof REALTIME_CONTRACT_VERSION;
  computedAt: string;
  activeLoop: LoopCandidate | null;
  lastSignals: readonly StreamSignal[];
  signalVelocity: number;
  userActivityState: UserActivityState;
  loopStabilityScore: number;
  lastLoopSwitchAt: string | null;
  wiring: LoopWiringResult;
  surfaceOverrideKey: string | null;
  systemLoadLevel?: SystemLoadLevel;
  learningPaused?: boolean;
  stabilityBlockedReason?: LoopStabilityGuardResult["blockedReason"];
};

export type RealtimeSurfaceFrame = {
  realtime: RealtimeState;
  composition: SurfaceCompositionFrame;
  overrideApplied: boolean;
  dominantLoop: LoopType | null;
};

export type RealtimeStabilityConfig = {
  minSwitchIntervalMs: number;
  scoreDeltaThreshold: number;
};

export const DEFAULT_REALTIME_STABILITY: RealtimeStabilityConfig = {
  minSwitchIntervalMs: 7000,
  scoreDeltaThreshold: 0.12,
};
