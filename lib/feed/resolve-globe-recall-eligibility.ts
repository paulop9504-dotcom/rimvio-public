import type { ExperienceEventTypeId } from "@/lib/experience-graph/experience-event-type-spec";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import { resolvePlanContextForCalendarRow } from "@/lib/plan-context/project-plan-to-feed-slot";
import type { EventCandidate } from "@/lib/events/event-candidate";

/** Types that usually carry spatial recall value when a place exists. */
const SPATIAL_EVENT_TYPES = new Set<ExperienceEventTypeId>([
  "travel",
  "date",
  "concert",
  "sport",
  "food",
  "family",
]);

/** Shown only when an explicit place label is present. */
const PLACE_GATED_EVENT_TYPES = new Set<ExperienceEventTypeId>([
  "daily",
  "work",
  "schedule",
]);

function hasSpatialLabel(
  volume: ExperienceVolume,
  placeHint?: string | null,
): boolean {
  const label = volume.space.label?.trim();
  const place = volume.space.place?.trim();
  const hint = placeHint?.trim();
  return Boolean(label || place || hint);
}

/** Pure read — should this feed context expose globe recall UI? */
export function isGlobeRecallEligible(input: {
  volume: ExperienceVolume | null | undefined;
  placeHint?: string | null;
}): boolean {
  const volume = input.volume;
  if (!volume) {
    return false;
  }

  const hasPlace = hasSpatialLabel(volume, input.placeHint);
  if (!hasPlace && volume.peaks.length === 0) {
    return false;
  }

  if (SPATIAL_EVENT_TYPES.has(volume.eventType)) {
    return hasPlace || volume.peaks.length > 0;
  }

  if (PLACE_GATED_EVENT_TYPES.has(volume.eventType)) {
    return hasPlace;
  }

  return hasPlace;
}

export function resolveGlobeRecallPlaceHint(
  slot: FeedTodaySlot,
  eventsById?: ReadonlyMap<string, EventCandidate>,
): string | null {
  if (slot.kind !== "calendar" || !eventsById) {
    return null;
  }
  const plan = resolvePlanContextForCalendarRow(slot.row, eventsById);
  return plan?.place?.trim() || slot.row.event.place?.trim() || null;
}
