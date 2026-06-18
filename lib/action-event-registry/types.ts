export type ActionEventLifecycle = "WARM" | "ACTIVE" | "ARCHIVED";

export type ActionEventKind = "generic" | "airport_travel";

/** Time-axis event — canonical registry entry (client localStorage). */
/** @deprecated EventCandidate (`lib/events/event-candidate`) is SSOT — projection only. */
export type ActionEventRecord = {
  id: string;
  task: string;
  placeName: string | null;
  targetTimeIso: string;
  kind: ActionEventKind;
  priority: number;
  sourceMessage: string;
  createdAt: string;
  updatedAt: string;
  phone?: string | null;
};

/** Evaluated projection — lifecycle computed at read time, never persisted. */
export type ActionEventEvaluated = ActionEventRecord & {
  lifecycle: ActionEventLifecycle;
  minutesUntil: number;
  activeWindowMinutes: number;
};

export type ActionEventWire = {
  id: string;
  task: string;
  place_name: string | null;
  target_time_iso: string;
  kind: ActionEventKind;
  lifecycle: ActionEventLifecycle;
  priority: number;
  minutes_until: number;
};
