"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import {
  BRIDGE_PUBLISH_LOGIN_REQUIRED,
  requireBridgeLinkBeforePublish,
} from "@/lib/experience-bridge/ensure-bridge-link-before-publish";
import { uploadBridgeCaptureBlob } from "@/lib/experience-bridge/upload-bridge-capture-blob";
import { notifyBridgeSharedMediaUpdated } from "@/lib/experience-bridge/notify-bridge-shared-media-updated";
import { invalidateBridgeApiCache } from "@/lib/experience-bridge/bridge-api-cache";
import { syncBridgeSharedMediaFromRemote } from "@/lib/experience-bridge/sync-bridge-participant-media";
import {
  patchFeedCaptureRemoteUrl,
  patchFeedCaptureAuthor,
  readFeedCaptureFragments,
} from "@/lib/feed/feed-capture-metadata";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { findEventCandidate } from "@/lib/events/event-store";
import { createClient } from "@/lib/supabase/client";
import { fetchMyAccountProfile } from "@/lib/peer-chat/peer-chat-client";

async function resolvePublisherAuthor(input: {
  authorDisplayName?: string;
}): Promise<{
  ownerUserId?: string;
  authorDisplayName: string;
  authorAvatarUrl?: string;
}> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const ownerUserId = data.session?.user?.id?.trim();
  if (!ownerUserId) {
    throw new Error(BRIDGE_PUBLISH_LOGIN_REQUIRED);
  }
  const profile = await fetchMyAccountProfile().catch(() => null);
  const authorDisplayName =
    input.authorDisplayName?.trim() ||
    profile?.displayName?.trim() ||
    profile?.rimvioId?.trim() ||
    "나";
  return {
    ownerUserId,
    authorDisplayName,
    authorAvatarUrl: profile?.avatarUrl?.trim() || undefined,
  };
}

async function postBridgeContribution(input: {
  eventId: string;
  capture: FeedCaptureFragment & {
    ownerUserId?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
  };
}): Promise<void> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.eventId)}/contributions`;
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capture: input.capture }),
  });
  const body = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error?.trim() || "공유 미디어를 저장하지 못했어요.");
  }
  invalidateBridgeApiCache(input.eventId);
}

/** After local ingest — publish photo/video to shared bridge for other members. */
export async function publishBridgeCaptureContribution(input: {
  eventId: string;
  fragment: FeedCaptureFragment;
  authorDisplayName?: string;
}): Promise<void> {
  const eventId = input.eventId.trim();
  if (!eventId) {
    return;
  }
  await requireBridgeLinkBeforePublish(eventId);
  if (input.fragment.kind !== "photo" && input.fragment.kind !== "video") {
    return;
  }

  let capture: FeedCaptureFragment & {
    ownerUserId?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
  } = {
    ...input.fragment,
    ...(await resolvePublisherAuthor({
      authorDisplayName: input.authorDisplayName,
    })),
  };

  const mediaUrl = await uploadBridgeCaptureBlob({
    eventId,
    capture: input.fragment,
  });
  if (!mediaUrl) {
    const label = capture.kind === "video" ? "동영상" : "사진";
    throw new Error(`공유 ${label} 업로드에 실패했어요. 다시 시도해 주세요.`);
  }
  capture = { ...capture, url: mediaUrl };

  await postBridgeContribution({ eventId, capture });

  notifyBridgeSharedMediaUpdated();
  await syncBridgeSharedMediaFromRemote(eventId, capture.ownerUserId).catch(() => {
    // Publish succeeded — background refresh is best-effort.
  });

  const localEvent = findEventCandidate(eventId);
  if (localEvent) {
    const patchedUrl = patchFeedCaptureRemoteUrl({
      event: localEvent,
      captureId: capture.id,
      url: mediaUrl,
    });
    const patchedAuthor = patchFeedCaptureAuthor({
      event: patchedUrl ?? localEvent,
      captureId: capture.id,
      ownerUserId: capture.ownerUserId,
      authorDisplayName: capture.authorDisplayName,
      authorAvatarUrl: capture.authorAvatarUrl,
    });
    const patched = patchedAuthor ?? patchedUrl;
    if (patched) {
      commitEventUpsert({
        id: patched.id,
        title: patched.title,
        category: patched.category,
        source: patched.source,
        lifecycle: patched.lifecycle,
        datetime: patched.datetime,
        place: patched.place,
        containerId: patched.containerId,
        confidence: patched.confidence,
        metadata: patched.metadata,
      });
    }
  }
}

/** Publish all new photo/video captures on a bridge event (batch after bulk ingest). */
export async function publishBridgeEventCaptureContributions(input: {
  event: EventCandidate;
  authorDisplayName?: string;
  onlyCaptureIds?: readonly string[];
}): Promise<void> {
  const eventId = input.event.id.trim();
  if (!eventId) {
    return;
  }
  await requireBridgeLinkBeforePublish(eventId);

  const allow = input.onlyCaptureIds
    ? new Set(input.onlyCaptureIds.map((id) => id.trim()))
    : null;

  for (const fragment of readFeedCaptureFragments(input.event)) {
    if (allow && !allow.has(fragment.id)) {
      continue;
    }
    if (fragment.kind !== "photo" && fragment.kind !== "video") {
      continue;
    }
    await publishBridgeCaptureContribution({
      eventId,
      fragment,
      authorDisplayName: input.authorDisplayName,
    });
  }
}
