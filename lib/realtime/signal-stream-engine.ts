import type { LoopWiringInput } from "@/lib/loop-wiring/loop-wiring-input";
import type { SignalCategory } from "@/lib/loop-wiring/loop-contract";
import {
  collectTriggerSignals,
  type TriggerSignal,
} from "@/lib/loop-wiring/collect-signals";
import type { StreamSignal, StreamSignalKind } from "@/lib/realtime/realtime-contract";
import { decayedStrength, computeSignalVelocity } from "@/lib/realtime/signal-decay";

export type StreamBufferEntry = StreamSignal & {
  ingestedAtMs: number;
};

const MAX_BUFFER = 128;

let buffer: StreamBufferEntry[] = [];

function categoryForStreamKind(kind: StreamSignalKind): SignalCategory {
  switch (kind) {
    case "gps_movement_pulse":
    case "gps_stationary_pulse":
    case "home_location_pulse":
      return "location";
    case "notification_burst":
    case "screen_wake":
    case "screen_sleep":
    case "system_interrupt":
      return "system";
    default:
      return "behavior";
  }
}

/**
 * Continuous ingestion — processes immediately (no batch queue).
 */
export function ingestStreamSignal(
  signal: StreamSignal,
  nowMs = Date.now(),
): StreamBufferEntry {
  const entry: StreamBufferEntry = {
    ...signal,
    category: signal.category ?? categoryForStreamKind(signal.kind),
    ingestedAtMs: nowMs,
  };
  buffer = [...buffer, entry].slice(-MAX_BUFFER);
  return entry;
}

export function ingestStreamSignals(
  signals: readonly StreamSignal[],
  nowMs = Date.now(),
): readonly StreamBufferEntry[] {
  return signals.map((row) => ingestStreamSignal(row, nowMs));
}

export function readStreamBuffer(): readonly StreamBufferEntry[] {
  return buffer;
}

export function resetStreamBufferForTests(): void {
  buffer = [];
}

function activeDecayedEntries(nowMs: number): StreamBufferEntry[] {
  return buffer
    .map((row) => ({
      ...row,
      strength: decayedStrength(row.strength, row.ingestedAtMs, nowMs, row.category),
    }))
    .filter((row) => row.strength >= 0.08);
}

function maxStrength(
  entries: readonly StreamBufferEntry[],
  kinds: readonly StreamSignalKind[],
): number {
  let max = 0;
  for (const row of entries) {
    if (kinds.includes(row.kind)) {
      max = Math.max(max, row.strength);
    }
  }
  return max;
}

/** Project decayed stream + clock into loop wiring facts. */
export function projectStreamToWiringInput(
  base: LoopWiringInput,
  now: Date,
): LoopWiringInput {
  const nowMs = now.getTime();
  const active = activeDecayedEntries(nowMs);
  const clockSignals: readonly TriggerSignal[] = collectTriggerSignals({
    ...base,
    now,
  });

  const notificationBurst = Math.max(
    base.notificationCountLast15Min ?? 0,
    Math.round(maxStrength(active, ["notification_burst"]) * 8),
  );
  const messageCluster = Math.max(
    base.messageCountLast15Min ?? 0,
    Math.round(maxStrength(active, ["message_burst"]) * 6),
  );
  const idleMinutes = Math.max(
    base.idleMinutes ?? 0,
    Math.round(maxStrength(active, ["idle_tick"]) * 60),
  );

  const navigatePulse = maxStrength(active, ["navigate_pulse"]);
  const mapPulse = maxStrength(active, ["map_search_pulse"]);
  const recentCapabilityIds = [...(base.recentCapabilityIds ?? [])];
  if (navigatePulse >= 0.35) {
    if (!recentCapabilityIds.includes("NAVIGATE")) {
      recentCapabilityIds.push("NAVIGATE");
    }
  }
  if (mapPulse >= 0.35) {
    if (!recentCapabilityIds.includes("MAP")) {
      recentCapabilityIds.push("MAP");
    }
  }

  const location = { ...base.location };
  if (maxStrength(active, ["gps_movement_pulse"]) >= 0.2) {
    location.isMoving = true;
  }
  if (maxStrength(active, ["gps_stationary_pulse"]) >= 0.2) {
    location.isStationary = true;
  }
  if (maxStrength(active, ["home_location_pulse"]) >= 0.2) {
    location.isHome = true;
  }

  const firstUnlockToday =
    base.firstUnlockToday === true ||
    maxStrength(active, ["screen_wake"]) >= 0.5;
  const alarmFiredRecently =
    base.alarmFiredRecently === true ||
    maxStrength(active, ["system_interrupt"]) >= 0.45;

  void clockSignals;

  return {
    ...base,
    now,
    notificationCountLast15Min: notificationBurst,
    messageCountLast15Min: messageCluster,
    idleMinutes,
    mapSearchRecently: base.mapSearchRecently === true || mapPulse >= 0.35,
    recentCapabilityIds,
    location: Object.keys(location).length > 0 ? location : base.location,
    firstUnlockToday,
    alarmFiredRecently,
  };
}

export function readSignalVelocity(nowMs = Date.now()): number {
  return computeSignalVelocity(buffer, nowMs);
}

export function readRecentStreamSignals(
  nowMs = Date.now(),
  limit = 24,
): readonly StreamSignal[] {
  return activeDecayedEntries(nowMs)
    .slice(-limit)
    .map(({ signalId, kind, category, timestamp, strength }) => ({
      signalId,
      kind,
      category,
      timestamp,
      strength,
    }));
}
