import { formatDateKey } from "@/lib/schedule/day-schedule";
import { buildTruthProjections } from "@/lib/source-of-truth/project-truth";
import type { LifeProjections, LifeProjectionsInput } from "@/lib/life-read-model/types";
import { listLifeEventCandidates } from "@/lib/life-read-model/internal/event-store-read";

/**
 * Canonical read path for Event SSOT projections (schedule + reminders).
 * UI and display layers must use this — not `event-store`.
 */
export function readLifeProjections(input: LifeProjectionsInput = {}): LifeProjections {
  const dateKey = input.dateKey ?? formatDateKey();
  const events = listLifeEventCandidates();
  const { existingSchedule, allReminders } = buildTruthProjections(events, dateKey);
  return {
    events,
    existingSchedule,
    allReminders,
    dateKey,
  };
}
