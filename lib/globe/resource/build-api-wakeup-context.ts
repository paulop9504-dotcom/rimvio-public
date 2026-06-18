import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ApiWakeupContext } from "@/lib/globe/resource/api-wakeup-types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type { PlanWeatherTarget } from "@/lib/plan-context/resolve-plan-weather-target";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildApiWakeupContextFromEvent(input: {
  event: EventCandidate;
  now?: Date;
  lat?: number | null;
  lng?: number | null;
  appForeground?: boolean;
  lastSyncedAtIso?: string | null;
}): ApiWakeupContext {
  const plan = readPlanContextFromEvent(input.event);
  const meta = input.event.metadata ?? {};
  const now = input.now ?? new Date();

  return {
    nowIso: now.toISOString(),
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    eventStartIso:
      plan?.windowStartIso?.trim() ||
      input.event.datetime?.trim() ||
      now.toISOString(),
    eventEndIso: plan?.windowEndIso ?? null,
    eventPlace:
      plan?.place?.trim() || input.event.place?.trim() || input.event.title.trim(),
    eventLat: readFiniteCoord(meta.globePlaceLat),
    eventLng: readFiniteCoord(meta.globePlaceLng),
    appForeground: input.appForeground,
    lastSyncedAtIso: input.lastSyncedAtIso ?? null,
  };
}

export function buildApiWakeupContextFromWeatherTarget(input: {
  target: PlanWeatherTarget;
  eventsById?: ReadonlyMap<string, EventCandidate>;
  now?: Date;
  lat?: number | null;
  lng?: number | null;
  appForeground?: boolean;
}): ApiWakeupContext {
  const now = input.now ?? new Date();
  const targetMs = Date.parse(input.target.targetIso);

  let matched: EventCandidate | null = null;
  if (input.eventsById && !Number.isNaN(targetMs)) {
    for (const event of input.eventsById.values()) {
      const eventMs = Date.parse(event.datetime?.trim() ?? "");
      const place = event.place?.trim() || event.title.trim();
      if (
        !Number.isNaN(eventMs) &&
        Math.abs(eventMs - targetMs) < 60 * 60 * 1000 &&
        place === input.target.location
      ) {
        matched = event;
        break;
      }
    }
  }

  if (matched) {
    return buildApiWakeupContextFromEvent({
      event: matched,
      now,
      lat: input.lat,
      lng: input.lng,
      appForeground: input.appForeground,
    });
  }

  return {
    nowIso: now.toISOString(),
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    eventStartIso: input.target.targetIso,
    eventPlace: input.target.location,
    appForeground: input.appForeground,
  };
}

export function readAppForeground(): boolean {
  if (typeof document === "undefined") {
    return true;
  }
  return document.visibilityState !== "hidden";
}
