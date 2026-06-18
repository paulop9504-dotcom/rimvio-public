"use client";

import { appendCorrectionLog } from "@/lib/corrections/correction-log";
import { applyGlobeContextPlaceCoords } from "@/lib/globe/apply-globe-context-place-coords";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { GLOBE_CONTEXT_NOTE_KEY } from "@/lib/globe/pin-context-note";

export type ExperiencePinContextPatch = {
  title?: string;
  place?: string;
  note?: string;
};

function requireEvent(eventId: string): EventCandidate {
  const existing = findLifeEventCandidate(eventId.trim());
  if (!existing) {
    throw new Error("event_not_found");
  }
  return existing;
}

/** User-edited pin hero — title / place on globe experience pins. */
export async function patchExperiencePinContext(
  eventId: string,
  patch: ExperiencePinContextPatch,
): Promise<EventCandidate> {
  const existing = requireEvent(eventId);
  const nextTitle = patch.title?.trim() || existing.title;
  const nextPlace =
    patch.place !== undefined ? patch.place.trim() || undefined : existing.place;

  if (!nextTitle.trim()) {
    throw new Error("empty_title");
  }

  const priorPlace = existing.place?.trim() || null;
  const correctedPlace = nextPlace?.trim() || null;
  if (
    patch.place !== undefined &&
    correctedPlace &&
    correctedPlace !== priorPlace
  ) {
    await appendCorrectionLog({
      user_input: correctedPlace,
      ai_inferred_location: priorPlace,
      ai_inferred_place_name: priorPlace,
      user_corrected_location: correctedPlace,
      user_corrected_place_name: correctedPlace,
      outcome: "corrected",
    });
  }

  let nextMetadata = {
    ...existing.metadata,
    pinContextEditedAt: new Date().toISOString(),
  };

  if (patch.note !== undefined) {
    const trimmed = patch.note.trim();
    nextMetadata = {
      ...nextMetadata,
      ...(trimmed
        ? { [GLOBE_CONTEXT_NOTE_KEY]: trimmed }
        : { [GLOBE_CONTEXT_NOTE_KEY]: undefined }),
    };
  }

  if (patch.place !== undefined && correctedPlace) {
    const withCoords = applyGlobeContextPlaceCoords(
      {
        ...existing,
        title: nextTitle,
        place: correctedPlace,
        metadata: nextMetadata,
      },
      correctedPlace,
    );
    return withCoords;
  }

  return commitEventUpsert({
    id: existing.id,
    title: nextTitle,
    category: existing.category,
    source: existing.source,
    lifecycle: existing.lifecycle,
    datetime: existing.datetime,
    place: nextPlace,
    containerId: existing.containerId,
    confidence: Math.min(0.98, existing.confidence + 0.02),
    metadata: nextMetadata,
    lifecycleUpdatedAt: existing.lifecycleUpdatedAt,
  });
}
