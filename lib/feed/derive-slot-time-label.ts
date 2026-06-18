import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import type { RankedSurface } from "@/lib/surface-engine/surface-contract";
import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";

function formatRelativeDay(dateKey: string, now: Date): string {
  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (dateKey === todayKey) {
    return "오늘";
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, "0"),
    String(tomorrow.getDate()).padStart(2, "0"),
  ].join("-");

  if (dateKey === tomorrowKey) {
    return "내일";
  }

  const [, month, day] = dateKey.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function padClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function deriveCalendarSlotTimeLabel(
  row: UnifiedCalendarOverlayRow,
  now = new Date(),
): string {
  const day = formatRelativeDay(row.event.dateKey, now);
  if (!row.event.hasTime) {
    return day;
  }
  return `${day} ${padClock(row.event.hour, row.event.minute)}`;
}

export function deriveSurfaceSlotTimeLabel(surface: RankedSurface, now = new Date()): string | null {
  const startAt = surface.events[0]?.startAt;
  if (!startAt) {
    return null;
  }
  const parsed = parseActionTargetDatetime(startAt);
  if (!parsed) {
    return null;
  }
  const dateKey = [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
  const day = formatRelativeDay(dateKey, now);
  const clock = padClock(parsed.getHours(), parsed.getMinutes());
  return `${day} ${clock}`;
}
