import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";

/** One capture per id + one row per https url — prevents duplicate slides. */
export function dedupeBridgeFeedCaptures(
  captures: readonly FeedCaptureFragment[],
): FeedCaptureFragment[] {
  const byId = new Map<string, FeedCaptureFragment>();
  const seenUrls = new Set<string>();

  for (const row of captures) {
    const id = row.id?.trim();
    if (!id) {
      continue;
    }
    const url = isUsableBridgeMediaUrl(row.url) ? row.url!.trim() : "";
    if (url && seenUrls.has(url)) {
      continue;
    }
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, row);
      if (url) {
        seenUrls.add(url);
      }
      continue;
    }
    const prevUrl = isUsableBridgeMediaUrl(prev.url) ? prev.url!.trim() : "";
    const next =
      url && !prevUrl
        ? row
        : prevUrl && !url
          ? prev
          : row;
    byId.set(id, next);
    const keepUrl = isUsableBridgeMediaUrl(next.url) ? next.url!.trim() : "";
    if (keepUrl) {
      seenUrls.add(keepUrl);
    }
  }

  return [...byId.values()];
}
