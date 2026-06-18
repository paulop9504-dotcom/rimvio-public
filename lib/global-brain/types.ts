import type { VitalityTag } from "@/lib/vitality/types";
import type { DayScheduleTask } from "@/lib/schedule/day-schedule";
import type { UserGoalWire } from "@/lib/goal-roadmap/types";
import type { TemporalResolution } from "@/lib/time/temporal-types";

export type UserStatusFlag =
  | "tired"
  | "stressed"
  | "hungry"
  | "overloaded"
  | "anxious"
  | "lonely"
  | "urgent"
  | "bored"
  | "neutral";

export type UserStatusRecord = {
  flag: UserStatusFlag;
  label: string;
  vitality: VitalityTag;
  sourceMessage?: string;
  updatedAt: string;
  /** ISO — auto-expire stale state (default 36h) */
  expiresAt: string;
};

export type UserStatusWire = UserStatusRecord;

export type EventHorizonKind =
  | "tired_heavy_schedule"
  | "tired_early_meeting"
  | "late_work_early_meeting"
  | "no_lunch_window"
  | "stressed_dense_day";

export type EventHorizonInsight = {
  kind: EventHorizonKind;
  headline: string;
  suggestion: string;
  severity: "medium" | "high";
};

export type UserLocationWire = {
  label: string | null;
  lat: number | null;
  lng: number | null;
  spatial_mode: "unknown" | "nearby_query" | "here_query";
};

export type GlobalBrainSnapshot = {
  currentDateTime: string;
  referenceDate: string;
  todaySchedule: DayScheduleTask[];
  remainingSchedule: DayScheduleTask[];
  sentinelTasks: DayScheduleTask[];
  userGoals: UserGoalWire[];
  userStatus: UserStatusRecord | null;
  recentStateMessages: Array<{ flag: UserStatusFlag; label: string; updatedAt: string }>;
  eventHorizon: EventHorizonInsight[];
  resolvedTemporal: TemporalResolution | null;
  userLocation: UserLocationWire | null;
  preferences: Array<{ key: string; value: string; label: string }>;
  nexusContacts: Array<{ name: string; lastContactAt: string | null }>;
  scheduleListBatch: {
    dateKey: string;
    dateLabel: string;
    count: number;
    items: Array<{ time: string; task: string; datetime: string; vitality?: string }>;
  } | null;
  actionEvents: import("@/lib/action-event-registry/types").ActionEventWire[];
};

export type GlobalBrainWire = {
  userStatusPatch?: UserStatusRecord | null;
  preferencePatch?: { key: string; value: string; label: string } | null;
  nexusContactTouch?: { name: string } | null;
  actionEventUpsert?: {
    task: string;
    place_name: string | null;
    target_time_iso: string;
    kind: import("@/lib/action-event-registry/types").ActionEventKind;
    priority: number;
    source_message: string;
  } | null;
};
