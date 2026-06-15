import type { CapabilityId } from "@/lib/capability-registry/capability-types";
import type { LoopWiringInput } from "@/lib/loop-wiring/loop-wiring-input";
import type { SignalKind, TriggerSignal } from "@/lib/loop-wiring/loop-contract";
import { getSignalDefinition } from "@/lib/loop-wiring/signal-registry";

let signalCounter = 0;

function nextSignalId(kind: SignalKind, timestamp: string): string {
  signalCounter += 1;
  return `sig-${kind}-${timestamp}-${signalCounter}`;
}

function hourMinute(
  now: Date,
  localTime?: LoopWiringInput["localTime"],
): { hour: number; minute: number } {
  if (localTime) {
    return { hour: localTime.hour, minute: localTime.minute ?? 0 };
  }
  return { hour: now.getHours(), minute: now.getMinutes() };
}

function emit(
  kind: SignalKind,
  timestamp: string,
  strengthScale = 1,
): TriggerSignal {
  const def = getSignalDefinition(kind);
  return {
    signalId: nextSignalId(kind, timestamp),
    kind,
    category: def.category,
    timestamp,
    strength: Math.min(1, def.baseStrength * strengthScale),
    reinforcementOnly: def.reinforcementOnly,
  };
}

function inWindow(hour: number, start: number, end: number): boolean {
  if (start <= end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
}

function collectTimeSignals(
  now: Date,
  timestamp: string,
  localTime?: LoopWiringInput["localTime"],
): TriggerSignal[] {
  const { hour } = hourMinute(now, localTime);
  const out: TriggerSignal[] = [];
  if (inWindow(hour, 6, 10)) {
    out.push(emit("wake_window", timestamp));
  }
  if (inWindow(hour, 7, 10) || inWindow(hour, 17, 20)) {
    out.push(emit("commute_window", timestamp, 0.9));
  }
  if (inWindow(hour, 11, 14)) {
    out.push(emit("lunch_window", timestamp));
  }
  if (hour >= 18 || hour < 6) {
    out.push(emit("evening_idle_window", timestamp, hour >= 18 ? 1 : 0.7));
  }
  return out;
}

function collectSystemSignals(input: LoopWiringInput, timestamp: string): TriggerSignal[] {
  const out: TriggerSignal[] = [];
  const notifications = input.notificationCountLast15Min ?? 0;
  if (notifications >= 1) {
    out.push(emit("notification_received", timestamp, Math.min(1, notifications / 5)));
  }
  if (notifications >= 3) {
    out.push(emit("notification_received", timestamp, 1));
  }
  if (input.alarmFiredRecently) {
    out.push(emit("alarm_fired", timestamp));
  }
  const proximity = input.calendarProximityHours;
  if (proximity !== undefined && proximity !== null && proximity >= 0 && proximity < 2) {
    const scale = proximity < 1 ? 1 : 0.85;
    out.push(emit("calendar_proximity", timestamp, scale));
  }
  return out;
}

function collectBehaviorSignals(input: LoopWiringInput, timestamp: string): TriggerSignal[] {
  const out: TriggerSignal[] = [];
  if (input.firstUnlockToday) {
    out.push(emit("first_unlock", timestamp));
  }
  const caps = input.recentCapabilityIds ?? [];
  if (caps.includes("NAVIGATE") || caps.includes("TAXI") || caps.includes("MAP")) {
    out.push(emit("navigate_intent", timestamp));
  }
  if (input.mapSearchRecently || caps.includes("SEARCH") || caps.includes("MAP")) {
    out.push(emit("map_search", timestamp));
  }
  if (caps.includes("MESSAGE") || caps.includes("CALL")) {
    out.push(emit("message_activity", timestamp));
  }
  const messages = input.messageCountLast15Min ?? 0;
  if (messages >= 2) {
    out.push(emit("message_activity", timestamp, Math.min(1, messages / 4)));
  }
  const idle = input.idleMinutes ?? 0;
  if (idle >= 20) {
    out.push(emit("idle_duration", timestamp, Math.min(1, idle / 60)));
  }
  return out;
}

function collectLocationSignals(input: LoopWiringInput, timestamp: string): TriggerSignal[] {
  const loc = input.location;
  if (!loc) {
    return [];
  }
  const out: TriggerSignal[] = [];
  if (loc.isMoving) {
    out.push(emit("gps_movement", timestamp));
  }
  if (loc.isStationary) {
    out.push(emit("stationary_detected", timestamp));
  }
  if (loc.repeatedLocationPattern) {
    out.push(emit("repeated_location_pattern", timestamp));
  }
  if (loc.isHome) {
    out.push(emit("repeated_location_pattern", timestamp, 0.8));
  }
  return out;
}

/** Collect all real-world signals for the frame (deterministic). */
export function collectTriggerSignals(input: LoopWiringInput = {}): TriggerSignal[] {
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  return [
    ...collectTimeSignals(now, timestamp, input.localTime),
    ...collectSystemSignals(input, timestamp),
    ...collectBehaviorSignals(input, timestamp),
    ...collectLocationSignals(input, timestamp),
  ];
}

export function buildContextSnapshot(
  input: LoopWiringInput,
  now: Date,
): import("@/lib/loop-wiring/loop-contract").LoopContextSnapshot {
  const { hour, minute } = hourMinute(now, input.localTime);
  return {
    dateKey: input.dateKey ?? now.toISOString().slice(0, 10),
    hour,
    minute,
    idleMinutes: input.idleMinutes,
    calendarProximityHours: input.calendarProximityHours ?? undefined,
    notificationBurst: input.notificationCountLast15Min,
    messageCluster: input.messageCountLast15Min,
    isHome: input.location?.isHome,
    isMoving: input.location?.isMoving,
  };
}

export function resetSignalCounterForTests(): void {
  signalCounter = 0;
}
