import { toEventCandidateWire } from "@/lib/events/emit-event-candidate";
import { readLifeProjections } from "@/lib/life-read-model";
import { buildTruthProjections } from "@/lib/source-of-truth/project-truth";
import { syncLinkRemindersToEventStore } from "@/lib/source-of-truth/sync-link-reminders";
import type { RimvioTruthWire } from "@/lib/source-of-truth/types";
import { formatDateKey } from "@/lib/schedule/day-schedule";

/**
 * Client-only — serializes Event SSOT + derived fields for orchestrate API.
 * Syncs link-reminder satellite into SSOT on this write-adjacent path only.
 */
export function serializeTruthForMasterContext(
  dateKey = formatDateKey(),
): RimvioTruthWire {
  syncLinkRemindersToEventStore();
  const life = readLifeProjections({ dateKey });
  const { existingSchedule, allReminders } = buildTruthProjections(life.events, dateKey);

  return {
    eventCandidates: life.events.map(toEventCandidateWire),
    existingSchedule,
    allReminders,
  };
}
