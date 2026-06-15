import type { ScheduleReminderWire, ScheduleRecord } from "@/lib/schedule-intelligence/types";
import { buildScheduleEventBlock } from "@/lib/schedule/infer-schedule-event-meta";
import { minutesToClock } from "@/lib/schedule/schedule-time-utils";

export function dateKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export function reminderToScheduleRecord(reminder: ScheduleReminderWire): ScheduleRecord {
  const at = new Date(reminder.fireAt);
  const startMinutes = at.getHours() * 60 + at.getMinutes();
  const block = buildScheduleEventBlock({
    id: reminder.id,
    title: reminder.title,
    startMinutes,
    contextText: reminder.title,
    source: "existing",
  });

  return {
    id: reminder.id,
    title: reminder.title.trim(),
    fireAt: reminder.fireAt,
    dateKey: dateKeyFromIso(reminder.fireAt),
    startMinutes,
    endMinutes: startMinutes + block.durationMinutes,
    url: reminder.url,
  };
}

export function remindersToScheduleRecords(
  reminders: ScheduleReminderWire[]
): ScheduleRecord[] {
  return reminders
    .map(reminderToScheduleRecord)
    .sort(
      (left, right) =>
        new Date(left.fireAt).getTime() - new Date(right.fireAt).getTime()
    );
}

export function formatRecordClock(record: ScheduleRecord): string {
  return minutesToClock(record.startMinutes);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T12:00:00+09:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export function weekRangeFromReference(referenceDate: string): {
  start: string;
  end: string;
} {
  const ref = new Date(`${referenceDate}T12:00:00+09:00`);
  const day = ref.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(ref);
  start.setDate(ref.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
