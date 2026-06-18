import {
  isBrokenThumbnailUrl,
  shouldPreferBrandPoster,
} from "@/lib/feed/link-brand-art";
import {
  isYouTubeDomain,
  isYouTubeThumbnail,
} from "@/lib/feed/feed-visual";
import { normalizeLinkCategory } from "@/lib/categories/types";
import type { LinkRow } from "@/types/database";

/** Categories that get full-bleed cover when a real photo thumbnail exists. */
export function isFeedCoverCategory(
  category: string | null | undefined
): boolean {
  if (!category?.trim()) {
    return false;
  }

  const raw = category.trim().toLowerCase();
  if (raw === "food" || raw === "place") {
    return true;
  }

  return normalizeLinkCategory(category) === "travel";
}

/** Thumbnail strong enough for full-bleed cover (not favicon/OG junk). */
export function hasFeedCoverThumbnail(
  link: Pick<LinkRow, "thumbnail_url" | "domain" | "original_url">
): boolean {
  const thumb = link.thumbnail_url?.trim();
  if (!thumb || isBrokenThumbnailUrl(thumb)) {
    return false;
  }

  if (shouldPreferBrandPoster(thumb, link.domain)) {
    return false;
  }

  if (
    isYouTubeDomain(link.domain, link.original_url) &&
    isYouTubeThumbnail(thumb)
  ) {
    return false;
  }

  return true;
}
