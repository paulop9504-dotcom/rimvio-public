"use client";

import { findEventCandidate } from "@/lib/events/event-store";
import {
  readFeedCaptureFragments,
} from "@/lib/feed/feed-capture-metadata";
import { FEED_CAPTURE_PENDING_VERIFY_META_KEY } from "@/lib/feed/feed-capture-types";
import type { GlobePhotoPlaceSuggestion } from "@/lib/globe/globe-photo-place-suggest-types";
import { GLOBE_PHOTO_PLACE_SUGGEST_META_KEY } from "@/lib/globe/globe-photo-place-suggest-types";
import { isCoordsPlaceLabel } from "@/lib/globe/is-coords-place-label";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function buildSuggestedEventTitle(
  existingTitle: string,
  placeName: string,
): string {
  const trimmed = existingTitle.trim();
  if (trimmed.endsWith(" 순간")) {
    return `${placeName} 순간`;
  }
  if (isCoordsPlaceLabel(trimmed)) {
    return `${placeName} 순간`;
  }
  return trimmed;
}

function patchCapturePlaceLabels(
  metadata: Record<string, unknown>,
  placeName: string,
): Record<string, unknown> {
  const fragments = readFeedCaptureFragments({ metadata });
  if (fragments.length === 0) {
    return metadata;
  }
  return {
    ...metadata,
    feedCaptures: fragments.map((fragment) => ({
      ...fragment,
      placeLabel: placeName,
    })),
  };
}

/** Stamp suggested venue on event — awaits inbox confirm before full trust. */
export function applyGlobePhotoPlaceSuggestion(input: {
  eventId: string;
  suggestion: GlobePhotoPlaceSuggestion;
}): boolean {
  const event = findEventCandidate(input.eventId.trim());
  if (!event) {
    return false;
  }

  const placeName = input.suggestion.placeName.trim();
  if (!placeName) {
    return false;
  }

  const title = buildSuggestedEventTitle(event.title, placeName);
  let metadata: Record<string, unknown> = {
    ...(event.metadata ?? {}),
    [GLOBE_PHOTO_PLACE_SUGGEST_META_KEY]: input.suggestion,
    [FEED_CAPTURE_PENDING_VERIFY_META_KEY]: true,
    targetingSource: "photo_place_suggest",
    globePlaceLat: input.suggestion.lat,
    globePlaceLng: input.suggestion.lng,
    ...(input.suggestion.googlePlaceId
      ? { globePlaceGoogleId: input.suggestion.googlePlaceId }
      : {}),
  };
  metadata = patchCapturePlaceLabels(metadata, placeName);

  commitEventUpsert({
    id: event.id,
    title,
    category: event.category === "schedule" ? "travel" : event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: placeName,
    containerId: event.containerId,
    confidence: Math.min(0.88, event.confidence + 0.08),
    metadata,
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
  });

  syncPersonalGlobePinFromEvent(event.id);
  return true;
}
