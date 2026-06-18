import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { removePersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export const GLOBE_CONTEXT_REMOVED_META = "globeContextRemoved";

export type DeleteGlobeContextResult = {
  eventId: string;
  removedPin: boolean;
  hidden: boolean;
  skipped: boolean;
  reason?: string;
};

export function isGlobeContextRemoved(event: EventCandidate | null | undefined): boolean {
  return event?.metadata?.[GLOBE_CONTEXT_REMOVED_META] === true;
}

/** Remove personal globe pin + hide experience from globe surfaces. */
export function deleteGlobeContext(eventId: string): DeleteGlobeContextResult {
  const key = eventId.trim();
  if (!key) {
    return {
      eventId: key,
      removedPin: false,
      hidden: false,
      skipped: true,
      reason: "empty_event_id",
    };
  }

  const removedPin = removePersonalGlobePinByEventId(key);
  const event = findLifeEventCandidate(key);
  if (!event) {
    return {
      eventId: key,
      removedPin,
      hidden: removedPin,
      skipped: !removedPin,
      reason: removedPin ? undefined : "event_not_found",
    };
  }

  if (isGlobeContextRemoved(event)) {
    return {
      eventId: key,
      removedPin,
      hidden: true,
      skipped: false,
    };
  }

  commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    confidence: event.confidence,
    metadata: {
      ...event.metadata,
      [GLOBE_CONTEXT_REMOVED_META]: true,
      globeContextRemovedAt: new Date().toISOString(),
    },
  });

  return {
    eventId: key,
    removedPin,
    hidden: true,
    skipped: false,
  };
}

export function deleteGlobeContexts(eventIds: readonly string[]): {
  deleted: number;
  results: DeleteGlobeContextResult[];
} {
  const results = eventIds.map((eventId) => deleteGlobeContext(eventId));
  const deleted = results.filter((row) => row.hidden || row.removedPin).length;
  return { deleted, results };
}
