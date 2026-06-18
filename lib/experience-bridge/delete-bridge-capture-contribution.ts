"use client";

import { findEventCandidate } from "@/lib/events/event-store";
import { readFeedCaptureFragments, removeFeedCaptureFragment } from "@/lib/feed/feed-capture-metadata";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { ensureBridgeLinkBeforePublish } from "@/lib/experience-bridge/ensure-bridge-link-before-publish";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { invalidateBridgeApiCache } from "@/lib/experience-bridge/bridge-api-cache";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";
import { deleteMediaBlob } from "@/lib/location-ping/media-blob-store";
import { deleteMediaSpacetimeContext } from "@/lib/location-ping/media-context-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function deleteRemoteBridgeContribution(input: {
  eventId: string;
  captureId: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user?.id) {
    throw new Error("로그인이 필요해요.");
  }

  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.eventId)}/contributions`;
  const response = await fetch(endpoint, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ captureId: input.captureId }),
  });
  const body = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error?.trim() || "공유 미디어를 삭제하지 못했어요.");
  }
  invalidateBridgeApiCache(input.eventId);
}

/** Remove own photo/video from bridge context — local + remote. */
export async function deleteBridgeCaptureContribution(input: {
  eventId: string;
  captureId: string;
  mediaContextId?: string | null;
}): Promise<void> {
  const eventId = input.eventId.trim();
  const captureId = input.captureId.trim();
  if (!eventId || !captureId) {
    throw new Error("삭제할 미디어를 찾지 못했어요.");
  }

  const event = findEventCandidate(eventId);
  if (!event) {
    throw new Error("맥락을 찾지 못했어요.");
  }

  const fragment = readFeedCaptureFragments(event).find(
    (row) => row.id === captureId || row.mediaContextId?.trim() === captureId,
  );
  const mediaContextId =
    input.mediaContextId?.trim() ||
    fragment?.mediaContextId?.trim() ||
    captureId;

  if (isBridgeLinkedEventId(eventId) || (await ensureBridgeLinkBeforePublish(eventId))) {
    await deleteRemoteBridgeContribution({ eventId, captureId });
  }

  const nextMetadata = removeFeedCaptureFragment(event.metadata, captureId);
  commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: nextMetadata,
  });

  await deleteMediaBlob(mediaContextId);
  await deleteMediaSpacetimeContext(mediaContextId);

  syncPersonalGlobePinFromEvent(eventId);
  notifyBridgeSharedMediaUpdated();
}
