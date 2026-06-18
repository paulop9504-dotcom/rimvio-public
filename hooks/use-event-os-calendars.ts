"use client";

import { useMemo } from "react";
import type { CalendarEventChip } from "@/lib/calendar/calendar-view-types";
import { useSurfaceEngine } from "@/hooks/use-surface-engine";
import {
  surfacesToEventChips,
  surfacesToOverlayRows,
} from "@/lib/surface-engine/adapters/surface-to-calendar";
import { projectActionCalendarChips } from "@/lib/action-projection/project-action-calendar";

/**
 * Calendar read path — Surface Engine CALENDAR channel only.
 * @internal use {@link useActionCalendar} in UI.
 */
export function useEventOsCalendars(anchor = new Date()) {
  const { calendar, result } = useSurfaceEngine({
    context: { now: anchor },
  });

  const eventChips = useMemo(
    () => surfacesToEventChips(calendar, anchor),
    [calendar, anchor],
  );

  const actionChips = useMemo(() => {
    const rows = surfacesToOverlayRows(calendar, anchor, anchor);
    const entries = rows.map((row) => ({
      ecId: row.event.eventId ?? row.id,
      title: row.event.title,
      startAt: new Date(row.event.startMs).toISOString(),
      actions: row.overlayActions.map((action) => ({
        id: action.id,
        label: action.label,
        phase: "T-2h" as const,
      })),
    }));
    return projectActionCalendarChips(entries, anchor);
  }, [calendar, anchor]);

  return { eventChips, actionChips, now: anchor, surfaces: calendar, computedAt: result.computedAt };
}
