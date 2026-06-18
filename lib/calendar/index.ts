/** Action Calendar SSOT — public read API surface. */
export type { ActionCalendarSnapshot } from "@/lib/calendar/build-action-calendar";
export { buildActionCalendar } from "@/lib/calendar/build-action-calendar";
export {
  buildPrepSurface,
  rowQualifiesForPrepLlm,
  type SchedulePrepSurface,
} from "@/lib/calendar/prep-surface-llm";
export type {
  CalendarEventChip,
  CalendarOverlayAction,
  CalendarViewMode,
  UnifiedCalendarOverlayRow,
} from "@/lib/calendar/calendar-view-types";
