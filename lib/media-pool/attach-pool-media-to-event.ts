"use client";

import { findEventCandidate } from "@/lib/events/event-store";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import {
  commitCaptureToEvent,
  type SearchCaptureIngestResult,
} from "@/lib/feed/ingest-search-capture";
import type { GlobeContextMediaIngestResult } from "@/lib/feed/ingest-globe-context-media";
import { CONTEXT_MATCH_MIN_SCORE } from "@/lib/ingest/context-match-media-gate";
import { enrichGlobePhotoPlaceAfterIngest } from "@/lib/globe/enrich-globe-photo-place-after-ingest";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import { publishBridgeCaptureContribution } from "@/lib/experience-bridge/publish-bridge-capture-contribution";
import { readMediaBlob } from "@/lib/location-ping/media-blob-store";
import { saveMediaSpacetimeContext } from "@/lib/location-ping/media-context-store";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import { findMediaPoolItem } from "@/lib/media-pool/list-media-pool-items";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function captureKindFromContext(
  context: MediaSpacetimeContext,
): FeedCaptureFragment["kind"] {
  return context.mediaKind === "video" ? "video" : "photo";
}

function mediaNoun(kind: FeedCaptureFragment["kind"]): string {
  return kind === "video" ? "동영상" : "사진";
}

function resolveHintedEvent(hintId: string) {
  const trimmed = hintId.trim();
  if (!trimmed) {
    return null;
  }
  return findEventCandidate(trimmed) ?? recoverGlobeContextEventFromPin(trimmed);
}

/** Move one staged pool item into a globe context — user picked target. */
export async function attachPoolMediaToEvent(input: {
  contextId: string;
  eventId: string;
  hintTitle?: string | null;
}): Promise<GlobeContextMediaIngestResult> {
  const poolItem = await findMediaPoolItem(input.contextId);
  if (!poolItem) {
    throw new Error("pool_item_missing");
  }

  const event = resolveHintedEvent(input.eventId);
  if (!event) {
    throw new Error("event_missing");
  }

  const attached: MediaSpacetimeContext = {
    ...poolItem,
    poolStatus: "attached",
    expiresAtIso: null,
    origin: "feed_capture",
    originRef: event.id,
  };
  await saveMediaSpacetimeContext(attached);

  const plan = readPlanContextFromEvent(event);
  const fragment: FeedCaptureFragment = {
    id: attached.id,
    kind: captureKindFromContext(attached),
    capturedAtIso: attached.capturedAtIso,
    mediaContextId: attached.id,
    placeLabel: attached.placeLabel ?? undefined,
  };

  const result = commitCaptureToEvent({
    target: event,
    match: {
      eventId: event.id,
      eventTitle: event.title,
      confidence: "high",
      score: CONTEXT_MATCH_MIN_SCORE,
      placeLabel: plan?.place ?? event.place ?? attached.placeLabel,
      dayLabel: null,
      reason: event.title,
    },
    createdNewEvent: false,
    fragment,
    userConfirmedTarget: true,
  });

  const pinResult = createPersonalGlobePinFromEvent({ event: result.event });
  syncPersonalGlobePinFromEvent(result.event.id);

  void publishBridgeCaptureContribution({
    eventId: result.event.id,
    fragment: result.fragment,
  }).catch(() => {
    // Non-blocking.
  });

  const blob = await readMediaBlob(attached.id);
  let suggestedPlaceName: string | null = null;
  if (blob) {
    try {
      const file = new File([blob], attached.fileName ?? "photo.jpg", {
        type: blob.type || "image/jpeg",
      });
      suggestedPlaceName = await enrichGlobePhotoPlaceAfterIngest({
        file,
        context: attached,
        eventId: result.event.id,
      });
    } catch {
      // Non-blocking.
    }
  }

  return {
    result,
    attachedToHintedEvent: true,
    separated: false,
    toastLine: `${event.title} 맥락에 ${mediaNoun(fragment.kind)} 붙였어요`,
    suggestedPlaceName,
    exifAutoPinned: false,
    pinCreated: pinResult.created,
    stagedToPool: false,
  };
}

export async function attachPoolMediaBatch(input: {
  contextIds: readonly string[];
  eventId: string;
  hintTitle?: string | null;
}): Promise<{
  attached: number;
  failed: number;
  lastEventId: string;
  toastLine: string;
}> {
  const ids = input.contextIds.map((id) => id.trim()).filter(Boolean);
  let attached = 0;
  let failed = 0;

  for (const contextId of ids) {
    try {
      await attachPoolMediaToEvent({
        contextId,
        eventId: input.eventId,
        hintTitle: input.hintTitle,
      });
      attached += 1;
    } catch {
      failed += 1;
    }
  }

  let toastLine = `${attached}개 맥락에 붙였어요`;
  if (attached === 0) {
    toastLine = "맥락에 붙이지 못했어요";
  } else if (failed > 0) {
    toastLine = `${attached}개 붙임 · ${failed}개 실패`;
  }

  return {
    attached,
    failed,
    lastEventId: input.eventId,
    toastLine,
  };
}

export type { SearchCaptureIngestResult };
