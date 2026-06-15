import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { experienceEventTypeById } from "@/lib/experience-graph/experience-event-type-spec";
import { resolveExperienceEventType } from "@/lib/experience-graph/resolve-experience-event-type";
import { resolvePlanContextForCalendarRow } from "@/lib/plan-context/project-plan-to-feed-slot";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";
import {
  planWeatherTargetKey,
  resolvePlanWeatherTarget,
  type PlanWeatherTarget,
} from "@/lib/plan-context/resolve-plan-weather-target";
import type { RankedSurface } from "@/lib/surface-engine/surface-contract";

function weatherPrepEnabledForEvent(event: EventCandidate): boolean {
  const eventType = resolveExperienceEventType(event);
  return experienceEventTypeById(eventType).prep.weather;
}

function resolveSurfaceWeatherTarget(
  surface: RankedSurface,
  eventsById?: ReadonlyMap<string, EventCandidate>,
): PlanWeatherTarget | null {
  const ref = surface.events[0];
  if (!ref || !eventsById) {
    return null;
  }
  const event = eventsById.get(ref.eventId);
  if (!event || !weatherPrepEnabledForEvent(event)) {
    return null;
  }
  const location = event.place?.trim() || event.title.trim();
  const iso = event.datetime?.trim() || ref.startAt?.trim();
  if (!location || !iso) {
    return null;
  }
  const targetMs = Date.parse(iso);
  if (Number.isNaN(targetMs)) {
    return null;
  }
  return {
    location,
    targetIso: new Date(targetMs).toISOString(),
  };
}

function resolveCalendarWeatherTarget(
  slot: FeedTodaySlot & { kind: "calendar" },
  eventsById?: ReadonlyMap<string, EventCandidate>,
): PlanWeatherTarget | null {
  const eventId = slot.row.event.eventId?.trim();
  const event = eventId && eventsById ? eventsById.get(eventId) : undefined;
  if (event && !weatherPrepEnabledForEvent(event)) {
    return null;
  }
  const plan = eventsById
    ? resolvePlanContextForCalendarRow(slot.row, eventsById)
    : null;
  return resolvePlanWeatherTarget(plan, slot.row);
}

export function resolveFeedSlotWeatherTarget(
  slot: FeedTodaySlot,
  eventsById?: ReadonlyMap<string, EventCandidate>,
): PlanWeatherTarget | null {
  if (slot.kind === "calendar") {
    return resolveCalendarWeatherTarget(slot, eventsById);
  }
  if (slot.kind === "surface") {
    return resolveSurfaceWeatherTarget(slot.surface, eventsById);
  }
  return null;
}

export function collectFeedSlotWeatherTargets(
  slots: readonly FeedTodaySlot[],
  eventsById?: ReadonlyMap<string, EventCandidate>,
): PlanWeatherTarget[] {
  const targets: PlanWeatherTarget[] = [];
  const seen = new Set<string>();

  for (const slot of slots) {
    const target = resolveFeedSlotWeatherTarget(slot, eventsById);
    if (!target) {
      continue;
    }
    const key = planWeatherTargetKey(target);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    targets.push(target);
  }

  return targets;
}
