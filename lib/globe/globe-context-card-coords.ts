"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolvePlaceCoordinates } from "@/lib/experience-graph/resolve-place-coordinates";
import {
  findPersonalGlobePinByEventId,
  upsertPersonalGlobePin,
} from "@/lib/globe/personal-globe-pin-store";
import { buildPinClusterFromEvent } from "@/lib/globe/build-pin-cluster-from-event";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { resolveGlobeContextPinCluster } from "@/lib/globe/resolve-globe-context-pin-cluster";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export type GlobeContextCardCoords = {
  lat: number;
  lng: number;
  placeLabel: string;
};

export function resolveGlobeContextPlaceLabel(event: EventCandidate): string {
  const meta = event.metadata ?? {};
  const plan = readPlanContextFromEvent(event);
  return (
    (typeof meta.globePlaceCardLabel === "string" && meta.globePlaceCardLabel.trim()) ||
    (typeof meta.globePlaceLabel === "string" && meta.globePlaceLabel.trim()) ||
    plan?.place?.trim() ||
    event.place?.trim() ||
    event.title.trim() ||
    "장소"
  );
}

/** Canonical coords saved on the context card — not finger-drag preview. */
export function readGlobeContextCardCoords(
  event: EventCandidate,
): GlobeContextCardCoords {
  const meta = event.metadata ?? {};
  const cardLat = readFiniteCoord(meta.globePlaceCardLat);
  const cardLng = readFiniteCoord(meta.globePlaceCardLng);
  if (cardLat !== null && cardLng !== null) {
    return {
      lat: cardLat,
      lng: cardLng,
      placeLabel: resolveGlobeContextPlaceLabel(event),
    };
  }

  const label = resolveGlobeContextPlaceLabel(event);
  const geocoded = resolvePlaceCoordinates(label);
  return {
    lat: geocoded.lat,
    lng: geocoded.lng,
    placeLabel: geocoded.label.trim() || label,
  };
}

/** Persist card anchor whenever place is saved on the context card. */
export function syncGlobeContextCardCoords(
  event: EventCandidate,
  placeLabel?: string,
  resolved?: { lat: number; lng: number; label: string },
): EventCandidate {
  const label = (placeLabel ?? resolveGlobeContextPlaceLabel(event)).trim();
  if (!label) {
    return event;
  }

  const geocoded =
    resolved ??
    (() => {
      const hit = resolvePlaceCoordinates(label);
      return { lat: hit.lat, lng: hit.lng, label: hit.label.trim() || label };
    })();
  const meta = event.metadata ?? {};
  const { globePlaceMovedAt: _removed, ...restMeta } = meta;

  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: label,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: {
      ...restMeta,
      globePlaceCardLat: geocoded.lat,
      globePlaceCardLng: geocoded.lng,
      globePlaceCardLabel: geocoded.label.trim() || label,
      globePlaceConfirmed: true,
      globePlaceLat: geocoded.lat,
      globePlaceLng: geocoded.lng,
      globePlaceLabel: geocoded.label.trim() || label,
    },
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
  });
}

/** After dismissing a finger-drag preview, snap pin back to card coords. */
export function revertGlobeContextPinToCardPlace(
  eventId: string,
): PinCluster | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  let event = findLifeEventCandidate(key) ?? recoverGlobeContextEventFromPin(key);
  if (!event) {
    return null;
  }

  const card = readGlobeContextCardCoords(event);
  const meta = { ...(event.metadata ?? {}) };
  delete meta.globePlaceMovedAt;

  event = commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: {
      ...meta,
      globePlaceConfirmed: true,
      globePlaceLat: card.lat,
      globePlaceLng: card.lng,
      globePlaceLabel: card.placeLabel,
    },
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
  });

  const pin = findPersonalGlobePinByEventId(event.id);
  if (pin) {
    upsertPersonalGlobePin({
      ...pin,
      lat: card.lat,
      lng: card.lng,
      placeLabel: card.placeLabel,
    });
  }

  return buildPinClusterFromEvent(event, pin);
}

/** Fly-to cluster using card-saved coords (ignores finger-drag preview). */
export function resolveGlobeContextCardPinCluster(
  eventId: string | null | undefined,
): PinCluster | null {
  const key = eventId?.trim();
  if (!key) {
    return null;
  }

  let event: EventCandidate | null = findLifeEventCandidate(key);
  if (!event) {
    event = recoverGlobeContextEventFromPin(key);
  }
  if (!event) {
    return resolveGlobeContextPinCluster(key);
  }

  const pin = findPersonalGlobePinByEventId(key);
  const base = buildPinClusterFromEvent(event, pin);
  const card = readGlobeContextCardCoords(event);
  return {
    ...base,
    lat: card.lat,
    lng: card.lng,
    placeLabel: card.placeLabel,
  };
}
