import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type BridgePreviewMedia = {
  url: string;
  kind: "photo" | "video";
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
};

/** First few photo/video urls from an event — invite cards & ghost sheet. */
export function projectBridgePreviewMedia(
  event: EventCandidate | null | undefined,
  limit = 4,
): BridgePreviewMedia[] {
  if (!event) {
    return [];
  }
  const rows: BridgePreviewMedia[] = [];
  for (const row of readFeedCaptureFragments(event)) {
    if (row.kind !== "photo" && row.kind !== "video") {
      continue;
    }
    const url = isUsableBridgeMediaUrl(row.url) ? row.url!.trim() : "";
    if (!url) {
      continue;
    }
    rows.push({
      url,
      kind: row.kind,
      authorDisplayName: row.authorDisplayName ?? null,
      authorAvatarUrl: row.authorAvatarUrl ?? null,
    });
    if (rows.length >= limit) {
      break;
    }
  }
  return rows;
}
