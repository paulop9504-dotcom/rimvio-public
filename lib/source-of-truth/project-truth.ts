import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  eventCandidatesToDaySchedule,
  formatDateKey,
  type ExistingScheduleInput,
} from "@/lib/schedule/day-schedule";

export type RimvioReminderWire = {
  id: string;
  title: string;
  fireAt: string;
  url?: string;
};

/** Schedule projection — read-only from Event SSOT. */
export function projectScheduleFromTruth(
  events: readonly EventCandidate[],
  dateKey = formatDateKey(),
): ExistingScheduleInput {
  return eventCandidatesToDaySchedule(events, dateKey);
}

/** Reminder-shaped projection for orchestrator / goal-engine (datetime-bearing events). */
export function projectRemindersFromTruth(
  events: readonly EventCandidate[],
): RimvioReminderWire[] {
  return events
    .filter((event) => Boolean(event.datetime?.trim()))
    .map((event) => ({
      id: event.id,
      title: event.title,
      fireAt: event.datetime!,
      url:
        typeof event.metadata?.url === "string"
          ? event.metadata.url
          : undefined,
    }));
}

export function buildTruthProjections(
  events: readonly EventCandidate[],
  dateKey = formatDateKey(),
): {
  existingSchedule: ExistingScheduleInput;
  allReminders: RimvioReminderWire[];
} {
  return {
    existingSchedule: projectScheduleFromTruth(events, dateKey),
    allReminders: projectRemindersFromTruth(events),
  };
}
