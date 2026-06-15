import { isYouTubeDomain, isYouTubeThumbnail } from "@/lib/feed/feed-visual";
import {
  hasFeedCoverThumbnail,
  isFeedCoverCategory,
} from "@/lib/feed/resolve-feed-cover";
import { isScreenshotLink } from "@/lib/share/ingest-screenshot";
import type { LinkRow } from "@/types/database";

export type FeedStoryLayout = "capture-cover" | "compact";

/** Full-bleed cover for captures + travel/food with real photos; URLs stay compact. */
export function resolveFeedStoryLayout(
  link: Pick<
    LinkRow,
    "thumbnail_url" | "domain" | "original_url" | "source_type" | "category"
  >
): FeedStoryLayout {
  const thumb = link.thumbnail_url?.trim();
  if (!thumb) {
    return "compact";
  }

  if (isScreenshotLink(link as LinkRow)) {
    return "capture-cover";
  }

  if (
    isYouTubeDomain(link.domain, link.original_url) &&
    isYouTubeThumbnail(thumb)
  ) {
    return "compact";
  }

  if (isFeedCoverCategory(link.category) && hasFeedCoverThumbnail(link)) {
    return "capture-cover";
  }

  return "compact";
}
