import type { LoopWiringInput } from "@/lib/loop-wiring/loop-wiring-input";
import type { StreamSignal, StreamSignalKind, UserActivityState } from "@/lib/realtime/realtime-contract";
import type { SignalCategory } from "@/lib/loop-wiring/loop-contract";

export type DeviceAdapterInput = {
  now?: Date;
  isForeground?: boolean;
  touchIntensity?: number;
  idleMinutes?: number;
  screenAwake?: boolean;
  screenJustWoke?: boolean;
  systemInterruptCount?: number;
  notificationCountLast15Min?: number;
  messageCountLast15Min?: number;
  mapSearchRecently?: boolean;
  recentCapabilityIds?: LoopWiringInput["recentCapabilityIds"];
  location?: LoopWiringInput["location"];
  localTime?: LoopWiringInput["localTime"];
};

export type DeviceAdapterSnapshot = {
  wiring: LoopWiringInput;
  activityState: UserActivityState;
  streamSignals: readonly StreamSignal[];
};

let streamCounter = 0;

function streamId(kind: StreamSignalKind, timestamp: string): string {
  streamCounter += 1;
  return `stream-${kind}-${timestamp}-${streamCounter}`;
}

function emitStream(
  kind: StreamSignalKind,
  category: SignalCategory,
  timestamp: string,
  strength: number,
): StreamSignal {
  return {
    signalId: streamId(kind, timestamp),
    kind,
    category,
    timestamp,
    strength: Math.max(0, Math.min(1, strength)),
  };
}

function resolveActivityState(input: DeviceAdapterInput): UserActivityState {
  if ((input.systemInterruptCount ?? 0) >= 2) {
    return "interrupted";
  }
  if (input.isForeground === false) {
    return "background";
  }
  const caps = input.recentCapabilityIds ?? [];
  if (caps.includes("NAVIGATE") || caps.includes("TAXI") || caps.includes("MAP")) {
    return "transit";
  }
  if ((input.idleMinutes ?? 0) >= 20) {
    return "idle";
  }
  return "active";
}

/**
 * Collect device facts → wiring input + stream signals (no batch queue).
 */
export function collectDeviceSignals(input: DeviceAdapterInput = {}): DeviceAdapterSnapshot {
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const streamSignals: StreamSignal[] = [];

  if (input.isForeground === true) {
    streamSignals.push(emitStream("app_foreground", "behavior", timestamp, 0.55));
  } else if (input.isForeground === false) {
    streamSignals.push(emitStream("app_background", "behavior", timestamp, 0.5));
  }

  const touch = input.touchIntensity ?? 0;
  if (touch > 0.15) {
    streamSignals.push(
      emitStream("touch_activity", "behavior", timestamp, Math.min(1, touch)),
    );
  }

  const idle = input.idleMinutes ?? 0;
  if (idle >= 1) {
    streamSignals.push(
      emitStream("idle_tick", "behavior", timestamp, Math.min(1, idle / 45)),
    );
  }

  if (input.screenJustWoke || input.screenAwake) {
    streamSignals.push(emitStream("screen_wake", "system", timestamp, 0.72));
  }
  if (input.screenAwake === false) {
    streamSignals.push(emitStream("screen_sleep", "system", timestamp, 0.6));
  }

  const interrupts = input.systemInterruptCount ?? 0;
  if (interrupts >= 1) {
    streamSignals.push(
      emitStream(
        "system_interrupt",
        "system",
        timestamp,
        Math.min(1, interrupts / 4),
      ),
    );
  }

  const notifications = input.notificationCountLast15Min ?? 0;
  if (notifications >= 1) {
    streamSignals.push(
      emitStream(
        "notification_burst",
        "system",
        timestamp,
        Math.min(1, notifications / 5),
      ),
    );
  }

  const messages = input.messageCountLast15Min ?? 0;
  if (messages >= 2) {
    streamSignals.push(
      emitStream("message_burst", "behavior", timestamp, Math.min(1, messages / 4)),
    );
  }

  const caps = input.recentCapabilityIds ?? [];
  if (caps.includes("NAVIGATE") || caps.includes("TAXI")) {
    streamSignals.push(emitStream("navigate_pulse", "behavior", timestamp, 0.75));
  }
  if (input.mapSearchRecently || caps.includes("MAP") || caps.includes("SEARCH")) {
    streamSignals.push(emitStream("map_search_pulse", "behavior", timestamp, 0.68));
  }

  const loc = input.location;
  if (loc?.isMoving) {
    streamSignals.push(emitStream("gps_movement_pulse", "location", timestamp, 0.35));
  }
  if (loc?.isStationary) {
    streamSignals.push(emitStream("gps_stationary_pulse", "location", timestamp, 0.28));
  }
  if (loc?.isHome) {
    streamSignals.push(emitStream("home_location_pulse", "location", timestamp, 0.32));
  }

  const wiring: LoopWiringInput = {
    now,
    localTime: input.localTime,
    idleMinutes: input.idleMinutes,
    notificationCountLast15Min: input.notificationCountLast15Min,
    messageCountLast15Min: input.messageCountLast15Min,
    mapSearchRecently: input.mapSearchRecently,
    recentCapabilityIds: input.recentCapabilityIds,
    location: input.location,
    firstUnlockToday: input.screenJustWoke === true,
    alarmFiredRecently: interrupts >= 1,
  };

  return {
    wiring,
    activityState: resolveActivityState(input),
    streamSignals,
  };
}

export function resetDeviceSignalAdapterForTests(): void {
  streamCounter = 0;
}
