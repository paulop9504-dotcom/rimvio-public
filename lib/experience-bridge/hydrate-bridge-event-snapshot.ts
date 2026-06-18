"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import {
  FEED_CAPTURES_META_KEY,
  type FeedCaptureFragment,
} from "@/lib/feed/feed-capture-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { uploadBridgeCaptureBlob } from "@/lib/experience-bridge/upload-bridge-capture-blob";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";

function isShareableBridgeCapture(capture: FeedCaptureFragment): boolean {
  return capture.kind === "photo" || capture.kind === "video";
}

function mediaLabel(capture: FeedCaptureFragment): string {
  return capture.kind === "video" ? "동영상" : "사진";
}

/** Host share prep — upload local blobs so invitees can load photos + videos. */
export async function hydrateBridgeEventSnapshotForShare(
  event: EventCandidate,
): Promise<EventCandidate> {
  const captures = readFeedCaptureFragments(event);
  if (captures.length === 0) {
    return event;
  }

  let changed = false;
  const nextCaptures: FeedCaptureFragment[] = [];
  const uploadErrors: string[] = [];

  for (const capture of captures) {
    if (!isShareableBridgeCapture(capture)) {
      nextCaptures.push(capture);
      continue;
    }
    if (isUsableBridgeMediaUrl(capture.url)) {
      nextCaptures.push(capture);
      continue;
    }

    try {
      const mediaUrl = await uploadBridgeCaptureBlob({
        eventId: event.id,
        capture,
      });
      if (!mediaUrl) {
        uploadErrors.push(`${mediaLabel(capture)} 업로드에 실패했어요.`);
        nextCaptures.push(capture);
        continue;
      }
      nextCaptures.push({ ...capture, url: mediaUrl });
      changed = true;
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : `${mediaLabel(capture)} 업로드에 실패했어요.`;
      uploadErrors.push(message);
      nextCaptures.push(capture);
    }
  }

  if (uploadErrors.length > 0) {
    throw new Error(uploadErrors[0]!);
  }

  if (!changed) {
    return event;
  }

  return commitEventUpsert({
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
      ...event.metadata,
      [FEED_CAPTURES_META_KEY]: nextCaptures,
    },
    lifecycleUpdatedAt: event.lifecycleUpdatedAt ?? new Date().toISOString(),
  });
}
