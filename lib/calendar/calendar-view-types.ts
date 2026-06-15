import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import type { ProjectedEventAction } from "@/lib/action-projection/types";
import type { CalendarScheduleOrigin } from "@/lib/calendar/resolve-calendar-schedule-origin";

export type CalendarViewMode = "list" | "day" | "3day" | "week" | "month";

export type CalendarLayer = "event" | "action";

export type CalendarChipTone = "blue" | "teal" | "grey" | "green";

export type CalendarEventChip = {
  id: string;
  layer: CalendarLayer;
  /** Event SSOT id (event layer) or source ecId (action layer). */
  eventId: string | null;
  /** Action layer only — legacy stream / projected behavior entries. */
  entry: ActiveActionEntry | null;
  projectedActions?: readonly ProjectedEventAction[];
  title: string;
  dateKey: string;
  startMs: number;
  hour: number;
  minute: number;
  tone: CalendarChipTone;
  hasTime: boolean;
  /** Event layer — Rimvio-native vs Google Calendar sync. */
  scheduleOrigin?: CalendarScheduleOrigin;
};

export type CalendarDayBucket = {
  dateKey: string;
  date: Date;
  weekdayLabel: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  items: CalendarEventChip[];
};

/** UI overlay action — not a calendar row (attached under event). */
export type CalendarOverlayAction = {
  id: string;
  label: string;
  source: "projection" | "stream";
  entry?: ActiveActionEntry;
  projectedAction?: import("@/lib/action-projection/types").ProjectedEventAction;
  /** Engine-assigned tier for prep surface spawn. */
  action_tier?: "MAIN" | "AUX";
  plugin?: string | null;
  /** Secondary generator reason. */
  secondary_reason?: "next_step" | "risk" | "convenience";
  deeplink?: string | null;
  /** Prep surface — why this action is MAIN. */
  ranking_why?: string | null;
};

/** Unified render row: Event base + attached actions (composition only). */
export type UnifiedCalendarOverlayRow = {
  id: string;
  event: CalendarEventChip;
  overlayActions: CalendarOverlayAction[];
  /** Muted context lines — not buttons */
  context_lines?: string[];
  prompt_hint?: string;
  spawn_phase?: import("@/lib/action-spawn/types").ActionSpawnPhase;
};

export const CALENDAR_VIEW_LABELS: Record<CalendarViewMode, string> = {
  list: "일정 목록",
  day: "일",
  "3day": "3일",
  week: "주간 일정 보기",
  month: "월간 일정 보기",
};

/** Compact label for the view switcher chip (avoids truncation in sheet header). */
export const CALENDAR_VIEW_SHORT_LABELS: Record<CalendarViewMode, string> = {
  list: "목록",
  day: "일",
  "3day": "3일",
  week: "주간",
  month: "월간",
};