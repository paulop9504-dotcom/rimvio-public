import {
  parseActionTargetDatetime,
  computeStudyCountUpElapsed,
} from "@/lib/action-chat/action-countdown";
import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import type {
  CalendarChipTone,
  CalendarDayBucket,
  CalendarEventChip,
} from "@/lib/calendar/calendar-view-types";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKeyFrom(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toneForKind(entry: ActiveActionEntry): CalendarChipTone {
  switch (entry.kind) {
    case "scheduled_nav":
      return "blue";
    case "link_reminder":
      return "teal";
    case "study_focus":
      return "blue";
    case "pending_confirm":
      return "grey";
    default:
      return "green";
  }
}

function resolveStart(entry: ActiveActionEntry, fallback: Date): { date: Date; hasTime: boolean } {
  if (entry.fireAt) {
    const parsed = parseActionTargetDatetime(entry.fireAt);
    if (parsed) {
      return { date: parsed, hasTime: entry.fireAt.includes("T") };
    }
  }
  return { date: startOfDay(fallback), hasTime: false };
}

function refreshEntryForDisplay(entry: ActiveActionEntry): ActiveActionEntry {
  if (entry.kind === "study_focus" && entry.fireAt) {
    return {
      ...entry,
      countdownLabel:
        computeStudyCountUpElapsed(entry.fireAt)?.headline ?? entry.countdownLabel,
    };
  }
  return entry;
}

/** Map Action Stream entries → calendar chips grouped by day. */
export function projectCalendarEvents(
  actions: readonly ActiveActionEntry[],
  anchor = new Date()
): CalendarEventChip[] {
  const fallback = startOfDay(anchor);

  return actions.map((raw) => {
    const entry = refreshEntryForDisplay(raw);
    const { date, hasTime } = resolveStart(entry, fallback);
    return {
      id: entry.id,
      layer: "action",
      eventId: null,
      entry,
      title: entry.title,
      dateKey: dateKeyFrom(date),
      startMs: date.getTime(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      tone: toneForKind(entry),
      hasTime,
    };
  });
}

export function groupEventsByDay(
  chips: readonly CalendarEventChip[],
  rangeStart: Date,
  rangeEnd: Date,
  now = new Date()
): CalendarDayBucket[] {
  const todayKey = dateKeyFrom(now);
  const buckets = new Map<string, CalendarDayBucket>();

  const cursor = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);

  while (cursor.getTime() <= end.getTime()) {
    const key = dateKeyFrom(cursor);
    buckets.set(key, {
      dateKey: key,
      date: new Date(cursor),
      weekdayLabel: WEEKDAY_KO[cursor.getDay()]!,
      dayNumber: cursor.getDate(),
      isToday: key === todayKey,
      isPast: key < todayKey,
      items: [],
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const chip of chips) {
    const bucket = buckets.get(chip.dateKey);
    if (bucket) {
      bucket.items.push(chip);
    }
  }

  for (const bucket of buckets.values()) {
    bucket.items.sort((left, right) => left.startMs - right.startMs);
  }

  return [...buckets.values()];
}

export function threeDayRange(anchor: Date): { start: Date; end: Date } {
  const start = startOfDay(anchor);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { start, end };
}

export function monthRange(anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { start, end };
}

export function weekRange(anchor: Date): { start: Date; end: Date } {
  const start = startOfDay(anchor);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

export function listRange(anchor: Date, days = 14): { start: Date; end: Date } {
  const start = startOfDay(anchor);
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  return { start, end };
}

export function formatMonthLabel(date: Date): string {
  return `${date.getMonth() + 1}월`;
}

export function formatMonthYear(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}
