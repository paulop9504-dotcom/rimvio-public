"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { CalendarEmptyActions } from "@/components/calendar/calendar-empty-actions";
import { useCopy } from "@/hooks/use-copy";
import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import { deriveActionCardPresentation } from "@/lib/action-chat/derive-action-card-presentation";
import type {
  CalendarEventChip,
  CalendarOverlayAction,
  CalendarViewMode,
  UnifiedCalendarOverlayRow,
} from "@/lib/calendar/calendar-view-types";
import {
  CALENDAR_VIEW_LABELS,
  CALENDAR_VIEW_SHORT_LABELS,
} from "@/lib/calendar/calendar-view-types";
import {
  groupOverlayRowsByDay,
  type UnifiedCalendarDayBucket,
} from "@/lib/calendar/compose-unified-calendar-overlay";
import {
  formatMonthYear,
  listRange,
  monthRange,
  threeDayRange,
  weekRange,
} from "@/lib/calendar/project-action-stream";
import { CalendarScheduleOriginBadge } from "@/components/action-chat/calendar-schedule-origin-badge";
import { OverlayEventChip } from "@/components/action-chat/overlay-event-chip";
import { calendarEventChipClass, calendarScheduleOriginDetail } from "@/lib/calendar/resolve-calendar-schedule-origin";
import { cn } from "@/lib/utils";

const VIEW_OPTIONS: CalendarViewMode[] = ["list", "day", "3day", "week", "month"];

const GRID_HOUR_START = 0;
const GRID_HOUR_END = 23;
const GRID_HOUR_HEIGHT = 44;
const TIME_GUTTER_WIDTH = 56;
const LIVE_BAR_COLOR = "#EA4335";

function dayColumnsStyle(dayCount: number): string {
  return `repeat(${dayCount}, minmax(88px, 1fr))`;
}

function formatHourLabel(hour: number): string {
  if (hour === 24) {
    return "24:00";
  }
  return `${String(hour).padStart(2, "0")}:00`;
}

function buildGridHours(): number[] {
  return Array.from(
    { length: GRID_HOUR_END - GRID_HOUR_START + 1 },
    (_, i) => GRID_HOUR_START + i
  );
}

/** Tick every second so the live bar moves in real time. */
function useLiveClock(tickMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return now;
}

function liveBarTop(now: Date, gridHeight: number): number | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const gridStart = GRID_HOUR_START * 60;
  const gridEnd = GRID_HOUR_END * 60 + 59;

  if (nowMinutes < gridStart || nowMinutes > gridEnd) {
    return null;
  }

  return ((nowMinutes - gridStart) / 60) * GRID_HOUR_HEIGHT;
}

function LiveTimeBar({
  top,
  variant,
}: {
  top: number;
  variant: "gutter" | "column";
}) {
  if (variant === "gutter") {
    return (
      <div
        className="pointer-events-none absolute right-0 z-30 flex items-center justify-end"
        style={{ top, transform: "translateY(-50%)" }}
      >
        <span
          className="size-2.5 rounded-full shadow-[0_0_0_2px_var(--rimvio-base)]"
          style={{ backgroundColor: LIVE_BAR_COLOR }}
        />
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
      style={{ top, transform: "translateY(-50%)" }}
    >
      <span
        className="-ml-1.5 size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: LIVE_BAR_COLOR }}
      />
      <span className="h-[2px] flex-1" style={{ backgroundColor: LIVE_BAR_COLOR }} />
    </div>
  );
}

function padTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function CalendarOriginLegend({ compact }: { compact?: boolean }) {
  const copy = useCopy();
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground",
        compact ? "mb-2" : "mb-3 shrink-0 px-0.5",
      )}
    >
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex size-3 rounded-sm bg-[#0D9488]" aria-hidden />
        <CalendarScheduleOriginBadge origin="rimvio" size="xs" />
        <span>{copy.calendar.originRimvio}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-flex size-3 rounded-sm border border-[#4285F4]/60 bg-[#4285F4]/15"
          aria-hidden
        />
        <CalendarScheduleOriginBadge origin="google_calendar" size="xs" />
        <span>{copy.calendar.originGoogle}</span>
      </span>
    </div>
  );
}

function CalendarEmptyHint({ compact }: { compact?: boolean }) {
  const copy = useCopy();
  return (
    <p
      className={cn(
        "mx-auto max-w-[18rem] text-center text-[12px] leading-5 text-muted-foreground",
        compact ? "mb-2" : "mb-3 shrink-0 px-2",
      )}
    >
      {copy.calendar.emptyHint}
    </p>
  );
}

function CalendarEmpty({
  compact,
  showActions,
}: {
  compact?: boolean;
  showActions?: boolean;
}) {
  const copy = useCopy();

  if (showActions) {
    return <CalendarEmptyActions compact={compact} />;
  }
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-secondary/60 px-4 py-8 text-center",
        compact && "py-5",
      )}
    >
      <p className="text-[14px] font-medium leading-snug text-foreground">
        {copy.calendar.emptyTitle}
      </p>
      <p className="mx-auto mt-2 max-w-[16rem] text-[12px] leading-5 text-muted-foreground">
        {copy.calendar.emptyListBody}
      </p>
    </div>
  );
}

function ListAgendaOverlayView({
  buckets,
  compact,
  showEmptyActions,
  onEventSelect,
  onActionSelect,
  onSpawnPrompt,
}: {
  buckets: UnifiedCalendarDayBucket[];
  compact?: boolean;
  showEmptyActions?: boolean;
  onEventSelect: (event: CalendarEventChip) => void;
  onActionSelect: (action: CalendarOverlayAction) => void;
  onSpawnPrompt?: (uri: string) => void;
}) {
  const visible = compact
    ? buckets.filter((bucket) => bucket.overlayRows.length > 0).slice(0, 5)
    : buckets;

  if (visible.every((bucket) => bucket.overlayRows.length === 0)) {
    return <CalendarEmpty compact={compact} showActions={showEmptyActions} />;
  }

  return (
    <div className="space-y-0">
      {visible.map((bucket, index) => (
        <div
          key={bucket.dateKey}
          className={cn(
            "flex gap-3 border-b border-border py-3",
            index === 0 && "pt-1"
          )}
        >
          <div className="flex w-10 shrink-0 flex-col items-center pt-0.5">
            <span className="text-[10px] font-medium text-muted-foreground">{bucket.weekdayLabel}</span>
            <span
              className={cn(
                "mt-0.5 flex size-8 items-center justify-center rounded-full text-[15px] font-semibold",
                bucket.isToday
                  ? "bg-primary text-white"
                  : bucket.isPast
                    ? "text-muted-foreground"
                    : "text-foreground"
              )}
            >
              {bucket.dayNumber}
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {bucket.overlayRows.length === 0 ? (
              <p className="py-2 text-[12px] text-muted-foreground">일정 없음</p>
            ) : (
              bucket.overlayRows.map((row) => (
                <OverlayEventChip
                  key={row.id}
                  event={row.event}
                  overlayActions={row.overlayActions}
                  context_lines={row.context_lines}
                  prompt_hint={row.prompt_hint}
                  compact={compact}
                  onEventSelect={onEventSelect}
                  onActionSelect={onActionSelect}
                  onSpawnPrompt={onSpawnPrompt}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimeGutter({
  hours,
  gridHeight,
  liveTop,
  scrollMarkerTop,
  scrollMarkerRef,
}: {
  hours: number[];
  gridHeight: number;
  liveTop: number | null;
  scrollMarkerTop: number;
  scrollMarkerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="relative shrink-0 bg-rimvio-base"
      style={{ width: TIME_GUTTER_WIDTH }}
    >
      <div className="relative" style={{ height: gridHeight }}>
        <div
          ref={scrollMarkerRef}
          aria-hidden
          className="pointer-events-none absolute left-0 w-px"
          style={{ top: scrollMarkerTop, height: 1 }}
        />
        {hours.map((hour, index) => (
          <div
            key={hour}
            className="absolute left-0 right-0 pr-2 text-right text-[11px] font-medium tabular-nums leading-none text-muted-foreground"
            style={{
              top: index * GRID_HOUR_HEIGHT,
              transform: "translateY(-50%)",
            }}
          >
            {formatHourLabel(hour)}
          </div>
        ))}
        <div
          className="absolute left-0 right-0 pr-2 text-right text-[11px] font-medium tabular-nums leading-none text-muted-foreground"
          style={{ top: gridHeight, transform: "translateY(-50%)" }}
        >
          24:00
        </div>
        {liveTop !== null ? <LiveTimeBar top={liveTop} variant="gutter" /> : null}
      </div>
    </div>
  );
}

function AllDayRow({
  buckets,
  onEventSelect,
  onActionSelect,
  onSpawnPrompt,
  showGutter = true,
}: {
  buckets: UnifiedCalendarDayBucket[];
  onEventSelect: (event: CalendarEventChip) => void;
  onActionSelect: (action: CalendarOverlayAction) => void;
  onSpawnPrompt?: (uri: string) => void;
  showGutter?: boolean;
}) {
  const hasAny = buckets.some((bucket) =>
    bucket.overlayRows.some((row) => !row.event.hasTime)
  );
  if (!hasAny) {
    return null;
  }

  return (
    <div className="flex border-b border-border">
      {showGutter ? (
        <div
          className="shrink-0 px-2 py-2 text-[9px] text-muted-foreground"
          style={{ width: TIME_GUTTER_WIDTH }}
        >
          종일
        </div>
      ) : null}
      <div
        className="grid min-w-0 flex-1"
        style={{ gridTemplateColumns: dayColumnsStyle(buckets.length) }}
      >
        {buckets.map((bucket) => (
          <div key={`allday-${bucket.dateKey}`} className="space-y-1 border-l border-border p-1">
            {bucket.overlayRows
              .filter((row) => !row.event.hasTime)
              .map((row) => (
                <OverlayEventChip
                  key={row.id}
                  event={row.event}
                  overlayActions={row.overlayActions}
                  context_lines={row.context_lines}
                  prompt_hint={row.prompt_hint}
                  compact
                  onEventSelect={onEventSelect}
                  onActionSelect={onActionSelect}
                  onSpawnPrompt={onSpawnPrompt}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeGridView({
  buckets,
  onEventSelect,
  onActionSelect,
  onSpawnPrompt,
}: {
  buckets: UnifiedCalendarDayBucket[];
  onEventSelect: (event: CalendarEventChip) => void;
  onActionSelect: (action: CalendarOverlayAction) => void;
  onSpawnPrompt?: (uri: string) => void;
}) {
  const now = useLiveClock();
  const scrollMarkerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hours = buildGridHours();
  const gridHeight = hours.length * GRID_HOUR_HEIGHT;
  const showNowLine = buckets.some((b) => b.dateKey === todayKey);
  const liveTop = showNowLine ? liveBarTop(now, gridHeight) : null;
  const scrollMarkerTop =
    liveTop ?? (Math.min(Math.max(now.getHours(), 0), 23) * GRID_HOUR_HEIGHT);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const target = scrollMarkerTop - container.clientHeight / 2;
    container.scrollTop = Math.max(0, target);
  }, [buckets.length, scrollMarkerTop]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 flex border-b border-border">
        <div className="shrink-0 bg-rimvio-base" style={{ width: TIME_GUTTER_WIDTH }} />
        <div
          className="grid min-w-0 flex-1 overflow-x-auto"
          style={{
            gridTemplateColumns: dayColumnsStyle(buckets.length),
            minWidth: `${buckets.length * 88}px`,
          }}
        >
          {buckets.map((bucket) => (
            <div key={bucket.dateKey} className="py-2 text-center">
              <p className="text-[10px] text-muted-foreground">{bucket.weekdayLabel}</p>
              <p
                className={cn(
                  "mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-[13px] font-semibold",
                  bucket.isToday ? "bg-primary text-white" : "text-foreground"
                )}
              >
                {bucket.dayNumber}
              </p>
            </div>
          ))}
        </div>
      </div>

      <AllDayRow
        buckets={buckets}
        onEventSelect={onEventSelect}
        onActionSelect={onActionSelect}
        onSpawnPrompt={onSpawnPrompt}
      />

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:thin]"
      >
        <div className="flex min-w-0">
          <TimeGutter
            hours={hours}
            gridHeight={gridHeight}
            liveTop={liveTop}
            scrollMarkerTop={scrollMarkerTop}
            scrollMarkerRef={scrollMarkerRef}
          />

          <div className="min-w-0 flex-1 overflow-x-auto">
            <div
              className="grid"
              style={{
                gridTemplateColumns: dayColumnsStyle(buckets.length),
                minWidth: `${buckets.length * 88}px`,
                height: gridHeight,
              }}
            >
              {buckets.map((bucket) => (
                <div
                  key={`grid-${bucket.dateKey}`}
                  className="relative border-l border-border bg-secondary/50"
                >
                  {hours.map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-border"
                      style={{ top: index * GRID_HOUR_HEIGHT, height: GRID_HOUR_HEIGHT }}
                    />
                  ))}

                  {liveTop !== null && bucket.dateKey === todayKey ? (
                    <LiveTimeBar top={liveTop} variant="column" />
                  ) : null}

                  {bucket.overlayRows
                    .filter((row) => row.event.hasTime)
                    .map((row) => {
                      const top =
                        ((row.event.hour * 60 +
                          row.event.minute -
                          GRID_HOUR_START * 60) /
                          60) *
                        GRID_HOUR_HEIGHT;
                      if (top < 0 || top > gridHeight) {
                        return null;
                      }
                      const blockHeight = Math.min(
                        120,
                        44 + row.overlayActions.length * 18
                      );
                      return (
                        <div
                          key={row.id}
                          className="absolute inset-x-1 z-10 overflow-hidden rounded-md bg-card/95 p-0.5 shadow-sm"
                          style={{
                            top: Math.max(0, top),
                            minHeight: blockHeight,
                            maxHeight: blockHeight + 8,
                          }}
                        >
                          <OverlayEventChip
                            event={row.event}
                            overlayActions={row.overlayActions}
                            context_lines={row.context_lines}
                            prompt_hint={row.prompt_hint}
                            compact
                            onEventSelect={onEventSelect}
                            onActionSelect={onActionSelect}
                  onSpawnPrompt={onSpawnPrompt}
                          />
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthGridView({
  anchor,
  overlayRows,
  onDaySelect,
}: {
  anchor: Date;
  overlayRows: UnifiedCalendarOverlayRow[];
  onDaySelect: (date: Date) => void;
}) {
  const { start: monthStart, end: monthEnd } = monthRange(anchor);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const buckets = groupOverlayRowsByDay(overlayRows, gridStart, gridEnd);
  const weeks: (typeof buckets)[] = [];
  for (let i = 0; i < buckets.length; i += 7) {
    weeks.push(buckets.slice(i, i + 7));
  }

  const weekdayHeaders = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="min-h-0 flex-1">
      <div className="mb-1.5 grid grid-cols-7 border-b border-border pb-1.5 text-center text-[10px] font-semibold text-muted-foreground">
        {weekdayHeaders.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="space-y-0.5">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-px rounded-lg bg-border/40 p-px">
            {week.map((bucket) => {
              const inMonth = bucket.date.getMonth() === anchor.getMonth();
              return (
                <button
                  key={bucket.dateKey}
                  type="button"
                  onClick={() => onDaySelect(bucket.date)}
                  className={cn(
                    "min-h-[4.25rem] bg-rimvio-base p-1 text-left transition-colors hover:bg-secondary",
                    !inMonth && "opacity-35",
                    bucket.isToday && "ring-1 ring-inset ring-[#4285F4]/60 bg-[#4285F4]/10"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
                      bucket.isToday ? "bg-primary text-white" : "text-foreground"
                    )}
                  >
                    {bucket.dayNumber}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {bucket.overlayRows.slice(0, 2).map((row) => (
                      <div
                        key={row.id}
                        className={cn(
                          "flex items-center gap-0.5 truncate rounded px-1 py-0.5 text-[9px] font-medium",
                          calendarEventChipClass(row.event),
                        )}
                      >
                        {row.event.layer === "event" ? (
                          <CalendarScheduleOriginBadge
                            origin={row.event.scheduleOrigin}
                            size="xs"
                          />
                        ) : null}
                        <span className="min-w-0 truncate">{row.event.title}</span>
                      </div>
                    ))}
                    {bucket.overlayRows.length > 2 ? (
                      <p className="px-0.5 text-[9px] text-muted-foreground">
                        +{bucket.overlayRows.length - 2}개
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewSwitcher({
  view,
  onViewChange,
  open,
  onOpenChange,
}: {
  view: CalendarViewMode;
  onViewChange: (mode: CalendarViewMode) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="보기 닫기"
        className="fixed inset-0 z-[85] cursor-default bg-transparent"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute right-0 top-full z-[86] mt-1.5 w-48 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
        <ul className="py-1">
          {VIEW_OPTIONS.map((mode) => {
            const selected = view === mode;
            return (
              <li key={mode}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewChange(mode);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2.5 text-[13px] font-medium transition-colors",
                    selected
                      ? "bg-[#4285F4] text-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  {CALENDAR_VIEW_LABELS[mode]}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

export type CalendarBoardProps = {
  overlayRows?: UnifiedCalendarOverlayRow[];
  contextByMessageId?: Record<string, string>;
  /** Stream/chat actions — executed on action click, not event structure. */
  renderStreamAction?: (entry: ActiveActionEntry) => React.ReactNode;
  variant?: "full" | "compact";
  /** Compact header label — defaults to "다가오는 일정". */
  compactTitle?: string;
  className?: string;
  defaultView?: CalendarViewMode;
  onExpand?: () => void;
  onAddSchedule?: () => void;
  onSpawnPrompt?: (uri: string) => void;
  /** Parent renders CalendarToolbar — hide built-in origin legend. */
  hideOriginLegend?: boolean;
  /** Empty list shows talk-schedule + Google connect CTAs. */
  showEmptyActions?: boolean;
  headerSlot?: ReactNode;
};

export function CalendarBoard({
  overlayRows = [],
  contextByMessageId,
  renderStreamAction,
  variant = "full",
  compactTitle = "다가오는 일정",
  className,
  defaultView = "month",
  onExpand,
  onAddSchedule,
  onSpawnPrompt,
  hideOriginLegend = false,
  showEmptyActions = false,
  headerSlot,
}: CalendarBoardProps) {
  const copy = useCopy();
  const compact = variant === "compact";
  const [view, setView] = useState<CalendarViewMode>(compact ? "list" : defaultView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<UnifiedCalendarOverlayRow | null>(null);
  const [selectedAction, setSelectedAction] = useState<CalendarOverlayAction | null>(null);
  const viewButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!switcherOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSwitcherOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [switcherOpen]);

  const range = useMemo(() => {
    switch (view) {
      case "day":
        return { start: anchor, end: anchor };
      case "3day":
        return threeDayRange(anchor);
      case "week":
        return weekRange(anchor);
      case "month":
        return monthRange(anchor);
      default:
        return listRange(anchor, compact ? 7 : 21);
    }
  }, [view, anchor, compact]);

  const buckets = useMemo(
    () => groupOverlayRowsByDay(overlayRows, range.start, range.end),
    [overlayRows, range.start, range.end]
  );

  const navStep = useMemo(() => {
    switch (view) {
      case "day":
        return 1;
      case "3day":
        return 3;
      case "week":
        return 7;
      case "month":
        return 1;
      default:
        return 7;
    }
  }, [view]);

  const shiftAnchor = (direction: -1 | 1) => {
    setAnchor((prev) => {
      const next = new Date(prev);
      if (view === "month") {
        next.setMonth(next.getMonth() + direction);
      } else {
        next.setDate(next.getDate() + direction * navStep);
      }
      return next;
    });
  };

  const goToday = () => setAnchor(new Date());

  const handleDayFromMonth = (date: Date) => {
    setAnchor(date);
    setView("day");
  };

  const selectedPresentation =
    selectedAction?.entry
      ? deriveActionCardPresentation(selectedAction.entry)
      : null;

  const isTimeGridView = !compact && view !== "list" && view !== "month";

  return (
    <div
      className={cn(
        "relative",
        compact
          ? "rounded-2xl bg-card px-3 py-3 text-foreground shadow-sm ring-1 ring-border/60"
          : "flex min-h-0 flex-1 flex-col bg-rimvio-base text-foreground",
        className
      )}
    >
      {headerSlot ? <div className="mb-2 shrink-0">{headerSlot}</div> : null}

      {!hideOriginLegend &&
      overlayRows.some((row) => row.event.layer === "event") ? (
        <CalendarOriginLegend compact={compact} />
      ) : null}

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {!compact ? (
            <>
              <button
                type="button"
                onClick={() => shiftAnchor(-1)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent"
                aria-label="이전"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="truncate text-[15px] font-semibold text-foreground hover:underline"
              >
                {formatMonthYear(anchor)}
              </button>
              <button
                type="button"
                onClick={() => shiftAnchor(1)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent"
                aria-label="다음"
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          ) : (
            <p className="text-[13px] font-semibold text-foreground">{compactTitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {compact && onExpand ? (
            <button
              type="button"
              onClick={onExpand}
              className="text-[11px] font-semibold text-primary"
            >
              전체 {overlayRows.length}건
            </button>
          ) : null}
          {!compact ? (
            <div ref={viewButtonRef} className="relative z-[87]">
              <button
                type="button"
                aria-expanded={switcherOpen}
                aria-haspopup="listbox"
                onClick={() => setSwitcherOpen((open) => !open)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  switcherOpen
                    ? "bg-primary/12 text-primary"
                    : "text-primary hover:bg-accent"
                )}
              >
                {CALENDAR_VIEW_SHORT_LABELS[view]}
              </button>
              <ViewSwitcher
                view={view}
                onViewChange={setView}
                open={switcherOpen}
                onOpenChange={setSwitcherOpen}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          !compact && "flex min-h-0 flex-1 flex-col px-3",
          !compact &&
            (isTimeGridView
              ? "overflow-hidden pb-[max(5rem,env(safe-area-inset-bottom))]"
              : "overflow-y-auto pb-[max(5.5rem,env(safe-area-inset-bottom))]"),
        )}
      >
        {view === "list" || compact ? (
          <ListAgendaOverlayView
            buckets={buckets}
            compact={compact}
            showEmptyActions={showEmptyActions}
            onSpawnPrompt={onSpawnPrompt}
            onEventSelect={(event) => {
              const row = overlayRows.find((item) => item.event.id === event.id);
              if (row) {
                setSelectedAction(null);
                setSelectedRow(row);
              }
            }}
            onActionSelect={(action) => {
              const row = overlayRows.find((item) =>
                item.overlayActions.some((overlay) => overlay.id === action.id)
              );
              if (row) {
                setSelectedRow(row);
                setSelectedAction(action);
              }
            }}
          />
        ) : view === "month" ? (
          <>
            {overlayRows.length === 0 ? (
              showEmptyActions ? (
                <CalendarEmptyActions className="mb-3" />
              ) : (
                <CalendarEmptyHint />
              )
            ) : null}
            <MonthGridView
              anchor={anchor}
              overlayRows={overlayRows}
              onDaySelect={handleDayFromMonth}
            />
          </>
        ) : (
          <>
            {overlayRows.length === 0 ? <CalendarEmptyHint /> : null}
            <TimeGridView
              buckets={buckets}
              onSpawnPrompt={onSpawnPrompt}
              onEventSelect={(event) => {
                const row = overlayRows.find((item) => item.event.id === event.id);
                if (row) {
                  setSelectedAction(null);
                  setSelectedRow(row);
                }
              }}
              onActionSelect={(action) => {
                const row = overlayRows.find((item) =>
                  item.overlayActions.some((overlay) => overlay.id === action.id)
                );
                if (row) {
                  setSelectedRow(row);
                  setSelectedAction(action);
                }
              }}
            />
          </>
        )}
      </div>

      {!compact ? (
        <>
          <button
            type="button"
            onClick={() => onAddSchedule?.()}
            className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-20 flex size-12 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_4px_20px_rgba(88,101,242,0.35)] transition-transform hover:scale-105 active:scale-95"
            aria-label={copy.calendar.addScheduleAria}
          >
            <Plus className="size-6 stroke-[2.5]" />
          </button>
        </>
      ) : null}

      {selectedRow ? (
        <div className="fixed inset-x-0 bottom-0 z-[90] mx-auto max-w-lg rounded-t-[20px] border border-border bg-popover p-4 shadow-2xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-foreground">
                {selectedRow.event.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {selectedRow.event.layer === "event" ? (
                  <CalendarScheduleOriginBadge origin={selectedRow.event.scheduleOrigin} />
                ) : null}
                <p className="text-[12px] text-muted-foreground">
                  {selectedRow.event.hasTime
                    ? padTime(selectedRow.event.hour, selectedRow.event.minute)
                    : copy.calendar.allDay}
                </p>
              </div>
              {selectedRow.event.layer === "event" ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {calendarScheduleOriginDetail(selectedRow.event.scheduleOrigin)}
                </p>
              ) : (
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {copy.calendar.savedSchedule}
                </p>
              )}
              {selectedPresentation ? (
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {selectedPresentation.timeLine} · {selectedPresentation.statusLabel}
                </p>
              ) : null}
              {selectedRow.overlayActions.length > 0 && !selectedAction ? (
                <ul className="mt-2 space-y-1">
                  {selectedRow.overlayActions.map((action) => (
                    <li
                      key={action.id}
                      className="text-[12px] font-medium text-primary"
                    >
                      {action.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedRow(null);
                setSelectedAction(null);
              }}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="size-4" />
            </button>
          </div>
          {selectedAction?.entry && renderStreamAction
            ? renderStreamAction(selectedAction.entry)
            : null}
        </div>
      ) : null}
    </div>
  );
}
