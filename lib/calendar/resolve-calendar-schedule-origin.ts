import type { CalendarChipTone, CalendarEventChip } from "@/lib/calendar/calendar-view-types";
import { GOOGLE_CALENDAR_SOURCE_REF } from "@/lib/events/google-calendar-ingest";

/** Where the schedule context was created — calendar UI distinguishes these. */
export type CalendarScheduleOrigin = "rimvio" | "google_calendar";

const CHIP_TONE_CLASS: Record<CalendarChipTone, string> = {
  blue: "bg-[#4285F4] text-white",
  teal: "bg-[#0D9488] text-white",
  grey: "bg-[#4B5563] text-white",
  green: "bg-[#16A34A] text-white",
};

export const CALENDAR_SCHEDULE_ORIGIN_LABEL: Record<CalendarScheduleOrigin, string> = {
  rimvio: "림비오",
  google_calendar: "Google",
};

export function resolveCalendarScheduleOrigin(input: {
  sourceRef?: string | null;
  eventId?: string | null;
}): CalendarScheduleOrigin {
  const sourceRef = input.sourceRef?.trim();
  if (sourceRef === GOOGLE_CALENDAR_SOURCE_REF) {
    return "google_calendar";
  }
  if (input.eventId?.startsWith("ec-gcal-")) {
    return "google_calendar";
  }
  return "rimvio";
}

export function calendarScheduleOriginLabel(
  origin: CalendarScheduleOrigin | undefined,
): string {
  return CALENDAR_SCHEDULE_ORIGIN_LABEL[origin ?? "rimvio"];
}

/** Event chip surface — solid fill for Rimvio, outlined for synced Google Calendar. */
export function calendarEventChipClass(
  event: Pick<CalendarEventChip, "tone" | "scheduleOrigin" | "layer">,
): string {
  if (event.layer === "action") {
    return CHIP_TONE_CLASS[event.tone];
  }

  const origin = event.scheduleOrigin ?? "rimvio";
  if (origin === "google_calendar") {
    return "border border-[#4285F4]/60 bg-[#4285F4]/12 text-[#DBEAFE]";
  }

  return CHIP_TONE_CLASS[event.tone];
}

export function calendarScheduleOriginDetail(
  origin: CalendarScheduleOrigin | undefined,
): string {
  return origin === "google_calendar"
    ? "Google Calendar에서 동기화된 일정"
    : "림비오에서 만든 맥락 일정";
}
