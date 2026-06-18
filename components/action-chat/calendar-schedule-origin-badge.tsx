"use client";

import type { CalendarScheduleOrigin } from "@/lib/calendar/resolve-calendar-schedule-origin";
import { calendarScheduleOriginLabel } from "@/lib/calendar/resolve-calendar-schedule-origin";
import { cn } from "@/lib/utils";

type CalendarScheduleOriginBadgeProps = {
  origin?: CalendarScheduleOrigin;
  size?: "sm" | "xs";
  className?: string;
};

export function CalendarScheduleOriginBadge({
  origin = "rimvio",
  size = "sm",
  className,
}: CalendarScheduleOriginBadgeProps) {
  const isGoogle = origin === "google_calendar";

  return (
    <span
      className={cn(
        "shrink-0 rounded font-semibold leading-none",
        size === "xs" ? "px-1 py-px text-[8px]" : "px-1.5 py-0.5 text-[9px]",
        isGoogle
          ? "bg-[#4285F4]/25 text-[#93C5FD]"
          : "bg-white/15 text-white/90",
        className,
      )}
    >
      {calendarScheduleOriginLabel(origin)}
    </span>
  );
}
