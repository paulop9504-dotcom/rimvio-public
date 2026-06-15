export const LOOP_WIRING_CONTRACT_VERSION = 1 as const;

/** Killer loop types — event-driven only, never manually activated. */
export type LoopType = "MORNING_LOOP" | "TRANSIT_LOOP" | "INTERRUPTION_LOOP" | "EVENING_LOOP";

export const LOOP_TYPES: readonly LoopType[] = [
  "MORNING_LOOP",
  "TRANSIT_LOOP",
  "INTERRUPTION_LOOP",
  "EVENING_LOOP",
] as const;

export type SignalCategory = "time" | "system" | "behavior" | "location";

export type SignalKind =
  | "wake_window"
  | "commute_window"
  | "lunch_window"
  | "evening_idle_window"
  | "notification_received"
  | "alarm_fired"
  | "calendar_proximity"
  | "navigate_intent"
  | "map_search"
  | "message_activity"
  | "idle_duration"
  | "gps_movement"
  | "stationary_detected"
  | "repeated_location_pattern"
  | "first_unlock";

export type TriggerSignal = {
  signalId: string;
  kind: SignalKind;
  category: SignalCategory;
  timestamp: string;
  /** 0–1 — probabilistic strength, not certainty. */
  strength: number;
  /** Location signals must not alone activate a loop. */
  reinforcementOnly?: boolean;
};

export type LoopContextSnapshot = {
  dateKey: string;
  hour: number;
  minute: number;
  idleMinutes?: number;
  calendarProximityHours?: number;
  notificationBurst?: number;
  messageCluster?: number;
  isHome?: boolean;
  isMoving?: boolean;
};

export type LoopCandidate = {
  loopType: LoopType;
  confidenceScore: number;
  triggerSignals: readonly TriggerSignal[];
  timestamp: string;
  contextSnapshot: LoopContextSnapshot;
};

export type LoopWiringResult = {
  contractVersion: typeof LOOP_WIRING_CONTRACT_VERSION;
  computedAt: string;
  candidates: readonly LoopCandidate[];
  activeLoop: LoopCandidate | null;
  suppressedLoops: readonly LoopType[];
};
