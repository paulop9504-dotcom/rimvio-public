"use client";

import { findLifeEventCandidate } from "@/lib/life-read-model";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import {
  findPersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";

/** Keep personal globe pin counts/labels in sync after photo attach. */
export function syncPersonalGlobePinFromEvent(
  eventId: string,
): PersonalGlobePin | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  const pin = findPersonalGlobePinByEventId(key);
  const event = findLifeEventCandidate(key);
  if (!pin || !event) {
    return pin;
  }

  const plan = readPlanContextFromEvent(event);
  const coords = resolveEventGlobeCoords(event);
  const { photoCount, videoCount } = countEventMedia(event);

  return upsertPersonalGlobePin({
    ...pin,
    placeLabel: coords.placeLabel,
    lat: coords.lat,
    lng: coords.lng,
    experienceTitle: plan?.title?.trim() || event.title.trim() || pin.experienceTitle,
    photoCount,
    videoCount,
  });
}
