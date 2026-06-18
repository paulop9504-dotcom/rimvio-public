"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  findPersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function clampLat(value: number): number {
  return Math.max(-85, Math.min(85, value));
}

function wrapLng(value: number): number {
  let lng = value;
  while (lng > 180) {
    lng -= 360;
  }
  while (lng < -180) {
    lng += 360;
  }
  return lng;
}

function requireEvent(eventId: string): EventCandidate {
  const existing = findLifeEventCandidate(eventId.trim());
  if (!existing) {
    throw new Error("event_not_found");
  }
  return existing;
}

/** User-dragged globe context pin — persists confirmed coordinates. */
export function relocateGlobeContextPin(input: {
  eventId: string;
  lat: number;
  lng: number;
  placeLabel?: string | null;
}): EventCandidate {
  const existing = requireEvent(input.eventId);
  const lat = clampLat(input.lat);
  const lng = wrapLng(input.lng);
  const prior = resolveEventGlobeCoords(existing);
  const placeLabel =
    input.placeLabel?.trim() ||
    prior.placeLabel.trim() ||
    existing.place?.trim() ||
    existing.title.trim() ||
    "위치";

  const updated = commitEventUpsert({
    id: existing.id,
    title: existing.title,
    category: existing.category,
    source: existing.source,
    lifecycle: existing.lifecycle,
    datetime: existing.datetime,
    place: existing.place,
    containerId: existing.containerId,
    confidence: Math.min(0.98, existing.confidence + 0.02),
    metadata: {
      ...existing.metadata,
      globePlaceConfirmed: true,
      globePlaceLat: lat,
      globePlaceLng: lng,
      globePlaceLabel: placeLabel,
      globePlaceMovedAt: new Date().toISOString(),
    },
    lifecycleUpdatedAt: existing.lifecycleUpdatedAt,
  });

  const pin = findPersonalGlobePinByEventId(existing.id);
  if (pin) {
    upsertPersonalGlobePin({
      ...pin,
      lat,
      lng,
      placeLabel,
    });
  }

  return updated;
}
