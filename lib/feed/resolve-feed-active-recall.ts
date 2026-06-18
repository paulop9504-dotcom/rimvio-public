import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { deriveExperienceSlotHeadline } from "@/lib/feed/derive-experience-slot-headline";
import { isGlobeRecallEligible, resolveGlobeRecallPlaceHint } from "@/lib/feed/resolve-globe-recall-eligibility";
import { resolveFeedSlotEventId, resolveExperienceVolumeForSlot } from "@/lib/feed/project-experience-feed-labels";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import { resolvePlanContextForCalendarRow } from "@/lib/plan-context/project-plan-to-feed-slot";
import {
  deriveCalendarSlotHeadline,
} from "@/lib/feed/build-feed-today-slots";
import { deriveFeedSlotHeadline } from "@/lib/feed/derive-feed-slot-display";

export function findFeedSlotByEventId(
  slots: readonly FeedTodaySlot[],
  eventId: string | null | undefined,
): FeedTodaySlot | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }
  return slots.find((slot) => resolveFeedSlotEventId(slot) === key) ?? null;
}

export function resolveFeedSlotRecallHeadline(
  slot: FeedTodaySlot,
  eventsById: ReadonlyMap<string, EventCandidate>,
): string {
  const eventId = resolveFeedSlotEventId(slot);
  const event = eventId ? eventsById.get(eventId) : null;
  const plan =
    slot.kind === "calendar" ? resolvePlanContextForCalendarRow(slot.row, eventsById) : null;
  const fallback =
    slot.kind === "surface"
      ? deriveFeedSlotHeadline(slot.surface)
      : deriveCalendarSlotHeadline(slot.row);
  return deriveExperienceSlotHeadline({
    event,
    plan,
    fallbackHeadline: fallback,
  }).headline;
}

export function isFeedSlotRecallEligible(
  slot: FeedTodaySlot,
  volumesByEventId: ReadonlyMap<string, ExperienceVolume> | undefined,
  eventsById: ReadonlyMap<string, EventCandidate>,
): boolean {
  const volume = resolveExperienceVolumeForSlot(slot, volumesByEventId, eventsById);
  return isGlobeRecallEligible({
    volume,
    placeHint: resolveGlobeRecallPlaceHint(slot, eventsById),
  });
}

export function pickDefaultFeedActiveEventId(
  slots: readonly FeedTodaySlot[],
  volumesByEventId: ReadonlyMap<string, ExperienceVolume> | undefined,
  eventsById: ReadonlyMap<string, EventCandidate>,
  preferEventId?: string | null,
): string | null {
  const preferred = preferEventId?.trim();
  if (preferred) {
    if (findFeedSlotByEventId(slots, preferred)) {
      return preferred;
    }
    if (eventsById.has(preferred)) {
      return preferred;
    }
  }
  for (const slot of slots) {
    if (isFeedSlotRecallEligible(slot, volumesByEventId, eventsById)) {
      return resolveFeedSlotEventId(slot);
    }
  }
  if (slots.length === 0) {
    return null;
  }
  return resolveFeedSlotEventId(slots[0]);
}
