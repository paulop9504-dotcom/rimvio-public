import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";

/** Bridge reel — feedCaptures only; IndexedDB store rows leak unrelated local files. */
export function shouldAppendMediaStoreForBridgeReel(bridgeShared: boolean): boolean {
  return !bridgeShared;
}

export function isOwnBridgeCapture(input: {
  capture: Pick<FeedCaptureFragment, "ownerUserId">;
  viewerUserId?: string | null;
}): boolean {
  const owner = input.capture.ownerUserId?.trim();
  const viewer = input.viewerUserId?.trim();
  if (!owner) {
    return true;
  }
  if (!viewer) {
    return false;
  }
  return owner === viewer;
}

/** Never show a friend's local blob guess — https or verified own blob only. */
export function shouldShowBridgeCaptureInReel(input: {
  capture: FeedCaptureFragment;
  imageUrl: string | null;
  allowLocalBlob: boolean;
  viewerUserId?: string | null;
}): boolean {
  if (isUsableBridgeMediaUrl(input.imageUrl ?? input.capture.url)) {
    return true;
  }
  if (input.allowLocalBlob) {
    return true;
  }
  return false;
}

/** Friend's media still uploading — shimmer only, never wrong blob. */
export function isBridgeCapturePendingRemote(input: {
  bridgeShared: boolean;
  imageUrl: string | null;
  allowLocalBlob: boolean;
  capture: FeedCaptureFragment;
  viewerUserId?: string | null;
}): boolean {
  if (!input.bridgeShared || input.imageUrl || input.allowLocalBlob) {
    return false;
  }
  if (
    isOwnBridgeCapture({
      capture: input.capture,
      viewerUserId: input.viewerUserId,
    })
  ) {
    return false;
  }
  return Boolean(input.capture.ownerUserId?.trim());
}

export function reelDedupeKey(input: {
  mediaContextId: string | null;
  imageUrl: string | null;
  id: string;
}): string {
  const url = input.imageUrl?.trim();
  if (url) {
    return `url:${url}`;
  }
  const mediaId = input.mediaContextId?.trim();
  if (mediaId) {
    return `media:${mediaId}`;
  }
  return `id:${input.id}`;
}
