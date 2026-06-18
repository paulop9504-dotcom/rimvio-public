import type { CapabilityId } from "@/lib/capability-registry/capability-types";

/** External facts for wiring — no manual loop activation. */
export type LoopWiringInput = {
  now?: Date;
  /** Device-local clock for time windows (defaults to `now` in runtime TZ). */
  localTime?: { hour: number; minute?: number };
  dateKey?: string;
  firstUnlockToday?: boolean;
  idleMinutes?: number;
  calendarProximityHours?: number | null;
  notificationCountLast15Min?: number;
  messageCountLast15Min?: number;
  alarmFiredRecently?: boolean;
  recentCapabilityIds?: readonly CapabilityId[];
  mapSearchRecently?: boolean;
  location?: {
    isHome?: boolean;
    isMoving?: boolean;
    isStationary?: boolean;
    repeatedLocationPattern?: boolean;
  };
};
