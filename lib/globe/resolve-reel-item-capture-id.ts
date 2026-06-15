import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";

/** Feed capture id for delete API + metadata patch. */
export function resolveReelItemCaptureId(item: ContextMediaReelItem): string {
  const prefixed = item.id.trim();
  if (prefixed.startsWith("capture:")) {
    return prefixed.slice("capture:".length);
  }
  if (prefixed.startsWith("store:")) {
    return prefixed.slice("store:".length);
  }
  return item.mediaContextId?.trim() || prefixed;
}

export function canViewerDeleteBridgeMediaItem(input: {
  item: ContextMediaReelItem;
  viewerUserId?: string | null;
}): boolean {
  const viewerId = input.viewerUserId?.trim();
  if (!viewerId) {
    return false;
  }
  const ownerId = input.item.ownerUserId?.trim();
  if (ownerId) {
    return ownerId === viewerId;
  }
  return input.item.allowLocalBlob === true;
}
