import type { EventCandidateWire } from "@/lib/events/event-candidate";
import type { ExistingScheduleInput } from "@/lib/schedule/day-schedule";

/** Client → server truth slice (Event SSOT mirror). */
export type RimvioTruthWire = {
  eventCandidates: EventCandidateWire[];
  /** Derived on server — do not treat as authoritative if eventCandidates present. */
  existingSchedule: ExistingScheduleInput;
  allReminders: Array<{ id: string; title: string; fireAt: string; url?: string }>;
};
