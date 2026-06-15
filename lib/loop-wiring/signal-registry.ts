import type { LoopType, SignalKind } from "@/lib/loop-wiring/loop-contract";

export type SignalDefinition = {
  kind: SignalKind;
  category: "time" | "system" | "behavior" | "location";
  /** Primary loop targets for this signal. */
  loopTypes: readonly LoopType[];
  baseStrength: number;
  reinforcementOnly: boolean;
};

/**
 * Every signal kind maps to ≥1 loop — no orphan signals.
 * GPS kinds are reinforcement-only (never primary trigger).
 */
export const SIGNAL_REGISTRY: readonly SignalDefinition[] = [
  { kind: "first_unlock", category: "behavior", loopTypes: ["MORNING_LOOP"], baseStrength: 0.72, reinforcementOnly: false },
  { kind: "wake_window", category: "time", loopTypes: ["MORNING_LOOP"], baseStrength: 0.65, reinforcementOnly: false },
  { kind: "commute_window", category: "time", loopTypes: ["TRANSIT_LOOP", "MORNING_LOOP"], baseStrength: 0.6, reinforcementOnly: false },
  { kind: "lunch_window", category: "time", loopTypes: ["INTERRUPTION_LOOP"], baseStrength: 0.45, reinforcementOnly: false },
  { kind: "evening_idle_window", category: "time", loopTypes: ["EVENING_LOOP"], baseStrength: 0.55, reinforcementOnly: false },
  { kind: "notification_received", category: "system", loopTypes: ["INTERRUPTION_LOOP"], baseStrength: 0.5, reinforcementOnly: false },
  { kind: "alarm_fired", category: "system", loopTypes: ["INTERRUPTION_LOOP", "MORNING_LOOP"], baseStrength: 0.58, reinforcementOnly: false },
  { kind: "calendar_proximity", category: "system", loopTypes: ["MORNING_LOOP", "TRANSIT_LOOP"], baseStrength: 0.62, reinforcementOnly: false },
  { kind: "navigate_intent", category: "behavior", loopTypes: ["TRANSIT_LOOP"], baseStrength: 0.7, reinforcementOnly: false },
  { kind: "map_search", category: "behavior", loopTypes: ["TRANSIT_LOOP"], baseStrength: 0.68, reinforcementOnly: false },
  { kind: "message_activity", category: "behavior", loopTypes: ["INTERRUPTION_LOOP"], baseStrength: 0.56, reinforcementOnly: false },
  { kind: "idle_duration", category: "behavior", loopTypes: ["EVENING_LOOP"], baseStrength: 0.52, reinforcementOnly: false },
  { kind: "gps_movement", category: "location", loopTypes: ["TRANSIT_LOOP"], baseStrength: 0.35, reinforcementOnly: true },
  { kind: "stationary_detected", category: "location", loopTypes: ["EVENING_LOOP"], baseStrength: 0.25, reinforcementOnly: true },
  { kind: "repeated_location_pattern", category: "location", loopTypes: ["TRANSIT_LOOP", "EVENING_LOOP"], baseStrength: 0.3, reinforcementOnly: true },
] as const;

const BY_KIND = new Map(SIGNAL_REGISTRY.map((row) => [row.kind, row]));

export function getSignalDefinition(kind: SignalKind): SignalDefinition {
  const row = BY_KIND.get(kind);
  if (!row) {
    throw new Error(`Orphan signal kind: ${kind}`);
  }
  return row;
}

export function assertNoOrphanSignalKinds(kinds: readonly SignalKind[]): void {
  for (const kind of kinds) {
    if (!BY_KIND.has(kind)) {
      throw new Error(`Unmapped signal kind: ${kind}`);
    }
  }
}
