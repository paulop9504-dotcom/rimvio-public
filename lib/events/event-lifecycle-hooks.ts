import type { EventCandidate } from "@/lib/events/event-candidate";
import { ingestCompletionSignal } from "@/lib/events/event-ingest-pipeline";

export {
  ingestCompletionSignal,
  ingestConfirmationSignal,
  ingestScheduleSignal,
  type EventIngestSignal,
} from "@/lib/events/event-ingest-pipeline";

/** Strict completion — ec-id required; NO fallback guessing. */
export function wireEventCompleted(input: {
  eventId?: string | null;
  anchorId?: string | null;
  actionId?: string | null;
  actionType?: string | null;
}): EventCandidate | null {
  return ingestCompletionSignal(input);
}
