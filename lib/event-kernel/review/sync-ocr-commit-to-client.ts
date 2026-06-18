import type { EventCandidateWire } from "@/lib/events/event-candidate";
import {
  applyEventCandidateUpsertFromApi,
  toEventCandidateWire,
} from "@/lib/events/emit-event-candidate";
import { readLifeProjections } from "@/lib/life-read-model";
import { scheduleLinkReminderAt } from "@/lib/local-links/reminders";
import type { CalendarEvent } from "@/lib/event-kernel/review/execute-approve-pending-events";

/** Server commit → wires for client SSOT persistence. */
export function buildEventCandidateUpsertsFromCommit(
  eventCandidateIds: readonly string[]
): EventCandidateWire[] {
  const byId = new Map(
    readLifeProjections().events.map((event) => [event.id, event]),
  );
  return eventCandidateIds
    .map((id) => byId.get(id) ?? null)
    .filter(
      (record): record is NonNullable<
        ReturnType<typeof readLifeProjections>["events"][number]
      > =>
        record !== null && record.lifecycle === "scheduled"
    )
    .map((record) => toEventCandidateWire(record));
}

/**
 * Mirror OCR calendar commit into browser storage (Event SSOT + link reminders).
 * Server orchestration writes in-memory; UI reads client localStorage only.
 */
export function applyOcrCalendarCommitToClient(input: {
  eventCandidateUpserts: readonly EventCandidateWire[];
  calendarEvents?: readonly CalendarEvent[];
}): { syncedEvents: number; syncedReminders: number } {
  let syncedEvents = 0;
  let syncedReminders = 0;

  for (const wire of input.eventCandidateUpserts) {
    if (applyEventCandidateUpsertFromApi(wire)) {
      syncedEvents += 1;
    }
  }

  for (const row of input.calendarEvents ?? []) {
    if (!row.start?.trim()) {
      continue;
    }
    scheduleLinkReminderAt({
      linkId: `ocr-event-${row.candidateId}`,
      title: row.title,
      url: "rimvio://calendar/ocr-review",
      fireAt: row.start,
    });
    syncedReminders += 1;
  }

  return { syncedEvents, syncedReminders };
}
