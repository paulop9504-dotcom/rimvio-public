import { migrateLinkRemindersToEventCandidates } from "@/lib/events/link-reminder-ingest";
import { readLinkRemindersList } from "@/lib/local-links/reminders";

/**
 * Satellite → SSOT sync (write path only).
 * Call before serializing truth for API — never from schedule/timeline reads.
 */
export function syncLinkRemindersToEventStore(): void {
  migrateLinkRemindersToEventCandidates(readLinkRemindersList());
}
