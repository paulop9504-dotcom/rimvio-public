import {
  isBrokenThumbnailUrl,
  shouldPreferBrandPoster,
} from "@/lib/feed/link-brand-art";
import {
  isYouTubeDomain,
  isYouTubeThumbnail,
} from "@/lib/feed/feed-visual";
import type { LinkRow } from "@/types/database";

/** OG/poster usable as blurred ambient backdrop in compact cards. */
export function hasCompactAmbientPoster(
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

  if (/maps_512dp|maps\/about\/images\/icons/i.test(thumb)) {
    return false;
  }

  return true;
}
