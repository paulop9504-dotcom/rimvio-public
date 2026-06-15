import type { LoopWiringInput } from "@/lib/loop-wiring/loop-wiring-input";

export const FIXTURE_MORNING_WIRING: LoopWiringInput = {
  now: new Date("2026-06-07T07:30:00.000Z"),
  localTime: { hour: 7, minute: 30 },
  firstUnlockToday: true,
  calendarProximityHours: 1.5,
};

export const FIXTURE_TRANSIT_WIRING: LoopWiringInput = {
  now: new Date("2026-06-07T08:15:00.000Z"),
  localTime: { hour: 8, minute: 15 },
  recentCapabilityIds: ["NAVIGATE"],
  mapSearchRecently: true,
  location: { isMoving: true },
};

export const FIXTURE_INTERRUPTION_WIRING: LoopWiringInput = {
  now: new Date("2026-06-07T14:00:00.000Z"),
  localTime: { hour: 14, minute: 0 },
  notificationCountLast15Min: 4,
  messageCountLast15Min: 3,
  alarmFiredRecently: true,
};

export const FIXTURE_EVENING_WIRING: LoopWiringInput = {
  now: new Date("2026-06-07T21:00:00.000Z"),
  localTime: { hour: 21, minute: 0 },
  idleMinutes: 35,
  location: { isHome: true, isStationary: true },
};

export const FIXTURE_GPS_ONLY: LoopWiringInput = {
  now: new Date("2026-06-07T15:30:00.000Z"),
  localTime: { hour: 15, minute: 30 },
  location: { isMoving: true, repeatedLocationPattern: true },
};
