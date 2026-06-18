import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";
import { isBridgeSharedEvent } from "@/lib/globe/is-bridge-shared-event";
import {
  isBridgeCapturePendingRemote,
  reelDedupeKey,
  shouldAppendMediaStoreForBridgeReel,
  shouldShowBridgeCaptureInReel,
} from "@/lib/globe/bridge-context-media-reel-policy";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";
import { buildGlobeContextMediaRecallCaption } from "@/lib/globe/build-context-media-recall-caption";

export type ContextMediaReelItem = {
  id: string;
  label: string;
  /** Recall line under map / pin media — "작년 여름 · 민수랑". */
  recallCaption: string;
  placeLabel: string | null;
  imageUrl: string | null;
  mediaContextId: string | null;
  capturedAtIso: string | null;
  kind: "photo" | "video";
  /** When false, never load IndexedDB blob — shared/remote captures need https url. */
  allowLocalBlob?: boolean;
  /** Bridge invitee — capture exists but https url not loaded yet. */
  pendingRemote?: boolean;
  ownerUserId?: string | null;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
};

type ContextMediaReelDraft = Omit<ContextMediaReelItem, "recallCaption">;

function parseCapturedMs(iso: string | null | undefined): number {
  if (!iso?.trim()) {
    return 0;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function isLocalEventMedia(
  eventId: string,
  mediaContextId: string | null | undefined,
): boolean {
  const key = eventId.trim();
  const mediaId = mediaContextId?.trim();
  if (!key || !mediaId) {
    return false;
  }
  return readMediaContextMemorySnapshot().some(
    (row) => row.id.trim() === mediaId && row.originRef?.trim() === key,
  );
}

function appendFromMediaStore(
  eventId: string,
  push: (item: ContextMediaReelDraft) => void,
  skipMediaIds: ReadonlySet<string>,
): void {
  const key = eventId.trim();
  if (!key) {
    return;
  }

  for (const row of readMediaContextMemorySnapshot()) {
    if (row.originRef?.trim() !== key) {
      continue;
    }
    const mediaId = row.id.trim();
    if (!mediaId || skipMediaIds.has(mediaId)) {
      continue;
    }
    if (row.mediaKind !== "photo" && row.mediaKind !== "video") {
      continue;
    }
    push({
      id: `store:${row.id}`,
      label:
        row.placeLabel?.trim() ||
        (row.mediaKind === "video" ? "동영상" : "사진"),
      placeLabel: row.placeLabel?.trim() || null,
      imageUrl: null,
      mediaContextId: row.id.trim(),
      capturedAtIso: row.capturedAtIso,
      kind: row.mediaKind,
      allowLocalBlob: true,
    });
  }
}

/** All photo/video for a context — newest first, no stock placeholders. */
export function projectContextMediaReel(input: {
  event: EventCandidate | null | undefined;
  volume: ExperienceVolume | null | undefined;
  limit?: number;
  viewerUserId?: string | null;
}): ContextMediaReelItem[] {
  const limit = input.limit ?? 48;
  const eventId = input.event?.id?.trim() ?? "";
  const bridgeShared = isBridgeSharedEvent(input.event);
  const viewerUserId = input.viewerUserId?.trim() || null;
  const items: ContextMediaReelItem[] = [];
  const seen = new Set<string>();

  const push = (item: ContextMediaReelDraft) => {
    const remoteUrl = item.imageUrl?.trim() || "";
    const mediaId = item.mediaContextId?.trim() || "";
    const dedupeKey = reelDedupeKey({
      id: item.id,
      imageUrl: remoteUrl || null,
      mediaContextId: mediaId || null,
    });
    const canShow =
      Boolean(remoteUrl) ||
      item.allowLocalBlob === true ||
      item.pendingRemote === true;
    if (!canShow) {
      return;
    }
    if (!dedupeKey || seen.has(dedupeKey) || items.length >= limit) {
      return;
    }
    if (!remoteUrl && item.allowLocalBlob && !mediaId) {
      return;
    }
    seen.add(dedupeKey);
    items.push({
      ...item,
      recallCaption: buildGlobeContextMediaRecallCaption({
        event: input.event,
        volume: input.volume,
        item,
        viewerUserId: input.viewerUserId,
      }),
    });
  };

  const linkedMediaIds = new Set<string>();

  for (const row of readFeedCaptureFragments(input.event)) {
    if (row.kind !== "photo" && row.kind !== "video") {
      continue;
    }
    const mediaContextId = row.mediaContextId?.trim() || null;
    const imageUrl = isUsableBridgeMediaUrl(row.url) ? row.url!.trim() : null;
    const allowLocalBlob = bridgeShared
      ? isLocalEventMedia(eventId, mediaContextId)
      : Boolean(mediaContextId);
    const pendingRemote = isBridgeCapturePendingRemote({
      bridgeShared,
      imageUrl,
      allowLocalBlob,
      capture: row,
      viewerUserId,
    });

    if (
      bridgeShared &&
      !shouldShowBridgeCaptureInReel({
        capture: row,
        imageUrl,
        allowLocalBlob,
        viewerUserId,
      }) &&
      !pendingRemote
    ) {
      continue;
    }

    push({
      id: `capture:${row.id}`,
      label:
        row.label?.trim() ||
        row.placeLabel?.trim() ||
        (row.kind === "video" ? "동영상" : "사진"),
      placeLabel: row.placeLabel?.trim() || null,
      imageUrl,
      mediaContextId,
      capturedAtIso: row.capturedAtIso,
      kind: row.kind,
      allowLocalBlob,
      pendingRemote,
      ownerUserId: row.ownerUserId ?? null,
      authorDisplayName: row.authorDisplayName ?? null,
      authorAvatarUrl: row.authorAvatarUrl ?? null,
    });
    if (mediaContextId) {
      linkedMediaIds.add(mediaContextId);
    }
  }

  if (eventId && shouldAppendMediaStoreForBridgeReel(bridgeShared)) {
    appendFromMediaStore(eventId, push, linkedMediaIds);
  }

  // Do not project volume spatial media into the pin reel — spacetime matching
  // leaks unrelated local uploads (e.g. Jeju video) into bridge/shared contexts.

  return items.sort(
    (left, right) =>
      parseCapturedMs(right.capturedAtIso) - parseCapturedMs(left.capturedAtIso),
  );
}
