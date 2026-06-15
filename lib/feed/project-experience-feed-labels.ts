import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { formatPrimaryExperiencePeak } from "@/lib/experience-graph/format-experience-axis";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlanContextForCalendarRow } from "@/lib/plan-context/project-plan-to-feed-slot";
import type { RankedSurface } from "@/lib/surface-engine/surface-contract";

export function resolveFeedSlotEventId(
  slot: FeedTodaySlot,
  _eventsById?: ReadonlyMap<string, EventCandidate>,
): string | null {
  if (slot.kind === "calendar") {
    return slot.row.event.eventId?.trim() || null;
  }
  const ref = slot.surface.events[0];
  return ref?.eventId?.trim() ?? null;
}

export function resolveExperienceVolumeForSlot(
  slot: FeedTodaySlot,
  volumesByEventId?: ReadonlyMap<string, ExperienceVolume>,
  eventsById?: ReadonlyMap<string, EventCandidate>,
): ExperienceVolume | null {
  const eventId = resolveFeedSlotEventId(slot, eventsById);
  if (!eventId || !volumesByEventId) {
    return null;
  }
  return volumesByEventId.get(eventId) ?? null;
}

export function deriveExperiencePeakHint(
  volume: ExperienceVolume | null | undefined,
): string | null {
  if (!volume) {
    return null;
  }
  return formatPrimaryExperiencePeak(volume);
}

export function deriveExperienceFeedContext(
  slot: FeedTodaySlot,
  volume: ExperienceVolume | null | undefined,
  eventsById?: ReadonlyMap<string, EventCandidate>,
): string | null {
  if (slot.kind === "calendar" && eventsById) {
    const plan = resolvePlanContextForCalendarRow(slot.row, eventsById);
    const parts: string[] = [];
    const peak = deriveExperiencePeakHint(volume);
    if (peak) {
      parts.push(peak);
    }
    if (plan?.place?.trim()) {
      parts.push(plan.place.trim());
    }
    if (parts.length > 0) {
      return parts.join(" · ");
    }
  }

  if (slot.kind === "surface" && volume) {
    return deriveExperiencePeakHint(volume);
  }

  return null;
}
