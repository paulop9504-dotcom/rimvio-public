import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { composeExperienceTypePrepLine } from "@/lib/experience-graph/compose-experience-type-prep-line";
import { resolveExperienceEventType } from "@/lib/experience-graph/resolve-experience-event-type";
import { resolveExperienceLens } from "@/lib/experience-graph/resolve-experience-lens";
import { resolvePlanContextForCalendarRow } from "@/lib/plan-context/project-plan-to-feed-slot";

function eventFromSlot(
  slot: FeedTodaySlot,
  eventsById?: ReadonlyMap<string, EventCandidate>,
): EventCandidate | null {
  if (!eventsById) {
    return null;
  }
  if (slot.kind === "calendar") {
    const eventId = slot.row.event.eventId?.trim();
    return eventId ? eventsById.get(eventId) ?? null : null;
  }
  const ref = slot.surface.events[0];
  return ref?.eventId ? eventsById.get(ref.eventId) ?? null : null;
}

/** Type-specific prep when weather prep is quiet. Pure read. */
export function resolveFeedSlotTypePrepLine(
  slot: FeedTodaySlot,
  eventsById?: ReadonlyMap<string, EventCandidate>,
  now = new Date(),
): string | null {
  const event = eventFromSlot(slot, eventsById);
  if (!event?.datetime?.trim()) {
    return null;
  }

  const targetMs = Date.parse(event.datetime);
  if (Number.isNaN(targetMs)) {
    return null;
  }

  const plan =
    slot.kind === "calendar" && eventsById
      ? resolvePlanContextForCalendarRow(slot.row, eventsById)
      : null;

  const eventType = resolveExperienceEventType(event);
  const lens = resolveExperienceLens({
    startIso: event.datetime,
    endIso: plan?.windowEndIso,
    now,
  });

  return composeExperienceTypePrepLine({
    eventType,
    lens,
    peerDisplayName: plan?.peerDisplayName,
    place: plan?.place ?? event.place,
    hoursUntil: (targetMs - now.getTime()) / 3_600_000,
  });
}
