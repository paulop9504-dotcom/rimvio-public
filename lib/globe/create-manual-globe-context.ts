"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildPlanEventDraft } from "@/lib/feed/bootstrap-spacetime-target";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import type { ManualContextResolvedPlace } from "@/lib/globe/resolve-manual-context-place-candidates";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type ManualGlobeContextInput = {
  title: string;
  place: string;
  /** Local ISO datetime from `<input type="datetime-local">`. */
  startIso: string;
  /** Trip length — defaults to 1 day window. */
  nights?: number;
  /** Kakao/Google/Naver pick — pins land on verified coordinates. */
  resolvedPlace?: ManualContextResolvedPlace | null;
};

export type ManualGlobeContextResult = {
  event: EventCandidate;
  pin: PersonalGlobePin;
  createdPin: boolean;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Fallback when browser gives date-only. */
export function defaultManualContextStartIso(now = new Date()): string {
  return (
    `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}` +
    `T${pad2(now.getHours())}:${pad2(now.getMinutes())}`
  );
}

/** User-authored schedule + personal globe pin — spacetime attach test anchor. */
export function createManualGlobeContext(
  input: ManualGlobeContextInput,
): ManualGlobeContextResult {
  const title = input.title.trim();
  const resolved = input.resolvedPlace;
  const place =
    resolved?.label.trim() ||
    resolved?.placeName.trim() ||
    input.place.trim();
  const startIso = input.startIso.trim() || defaultManualContextStartIso();

  if (!title) {
    throw new Error("empty_title");
  }
  if (!place) {
    throw new Error("empty_place");
  }

  const nights = Math.max(1, Math.min(14, input.nights ?? 1));
  const draft = buildPlanEventDraft({
    title,
    place,
    startIso,
    nights,
  });

  const event = commitEventUpsert({
    id: draft.id,
    title: draft.title,
    category: draft.category,
    source: "manual",
    lifecycle: "scheduled",
    datetime: draft.datetime,
    place: draft.place,
    confidence: draft.confidence,
    metadata: {
      ...draft.metadata,
      targetingSource: "globe_manual",
      globeManualContext: true,
      ...(resolved?.confirmed
        ? {
            globePlaceConfirmed: true,
            globePlaceLat: resolved.lat,
            globePlaceLng: resolved.lng,
            globePlaceLabel: resolved.label,
            globePlaceCardLat: resolved.lat,
            globePlaceCardLng: resolved.lng,
            globePlaceCardLabel: resolved.label,
            globePlaceAutoParsed: true,
          }
        : {}),
    },
    lifecycleUpdatedAt: draft.lifecycleUpdatedAt,
  });

  const { pin, created } = createPersonalGlobePinFromEvent({
    event,
    experienceTitle: title,
  });

  return { event, pin, createdPin: created };
}
