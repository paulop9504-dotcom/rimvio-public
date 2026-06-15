import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import type { DayScheduleTask } from "@/lib/schedule/day-schedule";

export type ScheduleOrganizeScope = "today" | "week";

export type ScheduleOrganizeItem = {
  id: string;
  timeLabel: string;
  title: string;
  startMs: number;
};

export type ScheduleOrganizeOverlap = {
  leftId: string;
  rightId: string;
  leftTime: string;
  rightTime: string;
};

export type ScheduleOrganizeRebalanceOption = {
  id: "RESCHEDULE" | "MERGE" | "DEFER";
  label: string;
  prompt: string;
};

export type ScheduleOrganizeSnapshot = {
  scope: ScheduleOrganizeScope;
  scopeLabel: string;
  items: ScheduleOrganizeItem[];
  conflictCount: number;
  overlaps: ScheduleOrganizeOverlap[];
  summaryLine: string;
  rebalanceActions: ScheduleOrganizeRebalanceOption[];
};

const BUFFER_MINUTES = 30;

function padTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1]!, 10) * 60 + Number.parseInt(match[2]!, 10);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfWeek(date: Date): Date {
  const end = startOfDay(date);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function parseScheduleOrganizeScope(query: string): ScheduleOrganizeScope {
  const text = query.trim().toLowerCase();
  if (/이번\s*주|week|주간/u.test(text)) {
    return "week";
  }
  return "today";
}

export function scopeLabelFor(scope: ScheduleOrganizeScope): string {
  return scope === "week" ? "이번 주" : "오늘";
}

function rowToItem(row: UnifiedCalendarOverlayRow): ScheduleOrganizeItem {
  const { event } = row;
  return {
    id: row.id,
    timeLabel: event.hasTime ? padTime(event.hour, event.minute) : "종일",
    title: event.title.trim() || "일정",
    startMs: event.startMs,
  };
}

export function projectScheduleOrganizeItems(input: {
  overlayRows: readonly UnifiedCalendarOverlayRow[];
  now?: Date;
  scope?: ScheduleOrganizeScope;
}): ScheduleOrganizeItem[] {
  const now = input.now ?? new Date();
  const scope = input.scope ?? "today";
  const dayStart = startOfDay(now).getTime();
  const dayEnd = startOfDay(now);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const weekEnd = endOfWeek(now).getTime();

  return input.overlayRows
    .filter((row) => {
      if (row.event.layer !== "event") {
        return false;
      }
      const startMs = row.event.startMs;
      if (scope === "today") {
        return startMs >= dayStart && startMs < dayEnd.getTime();
      }
      return startMs >= now.getTime() && startMs <= weekEnd;
    })
    .map(rowToItem)
    .sort((left, right) => left.startMs - right.startMs)
    .slice(0, scope === "week" ? 12 : 8);
}

function detectInternalOverlaps(items: ScheduleOrganizeItem[]): ScheduleOrganizeOverlap[] {
  const overlaps: ScheduleOrganizeOverlap[] = [];

  for (let index = 0; index < items.length; index += 1) {
    for (let other = index + 1; other < items.length; other += 1) {
      const left = items[index]!;
      const right = items[other]!;
      if (left.timeLabel === "종일" || right.timeLabel === "종일") {
        continue;
      }
      const leftMin = parseTimeMinutes(left.timeLabel);
      const rightMin = parseTimeMinutes(right.timeLabel);
      if (leftMin == null || rightMin == null) {
        continue;
      }
      if (Math.abs(leftMin - rightMin) < BUFFER_MINUTES) {
        overlaps.push({
          leftId: left.id,
          rightId: right.id,
          leftTime: left.timeLabel,
          rightTime: right.timeLabel,
        });
      }
    }
  }

  return overlaps;
}

function buildRebalanceActions(scopeLabel: string): ScheduleOrganizeRebalanceOption[] {
  return [
    {
      id: "RESCHEDULE",
      label: "재배치",
      prompt: `${scopeLabel} 일정 겹치는 것 30분씩 재배치해줘`,
    },
    {
      id: "MERGE",
      label: "합치기",
      prompt: `${scopeLabel} 인접한 일정 하나로 합쳐줘`,
    },
    {
      id: "DEFER",
      label: "미루기",
      prompt: `${scopeLabel} 우선순위 낮은 일정 내일로 미뤄줘`,
    },
  ];
}

function buildSummaryLine(
  items: ScheduleOrganizeItem[],
  conflictCount: number,
  scopeLabel: string,
): string {
  if (items.length === 0) {
    return `${scopeLabel} 등록된 일정이 없어요`;
  }
  if (conflictCount > 0) {
    return `${scopeLabel} ${items.length}건 · 겹침 ${conflictCount}건`;
  }
  return `${scopeLabel} 남은 일정 ${items.length}건`;
}

/** Pure read — calendar overlay → organize snapshot. */
export function buildScheduleOrganizeSnapshot(input: {
  overlayRows: readonly UnifiedCalendarOverlayRow[];
  query?: string;
  now?: Date;
}): ScheduleOrganizeSnapshot {
  const now = input.now ?? new Date();
  const scope = parseScheduleOrganizeScope(input.query ?? "");
  const scopeLabel = scopeLabelFor(scope);
  const items = projectScheduleOrganizeItems({
    overlayRows: input.overlayRows,
    now,
    scope,
  });
  const overlaps = detectInternalOverlaps(items);
  const conflictCount = overlaps.length;

  return {
    scope,
    scopeLabel,
    items,
    conflictCount,
    overlaps,
    summaryLine: buildSummaryLine(items, conflictCount, scopeLabel),
    rebalanceActions:
      items.length > 0 && conflictCount > 0
        ? buildRebalanceActions(scopeLabel)
        : items.length > 0
          ? buildRebalanceActions(scopeLabel).slice(0, 1)
          : [],
  };
}

export function scheduleOrganizeItemsToDayTasks(
  items: readonly ScheduleOrganizeItem[],
): DayScheduleTask[] {
  return items
    .filter((item) => item.timeLabel !== "종일")
    .map((item) => ({ time: item.timeLabel, task: item.title }));
}
