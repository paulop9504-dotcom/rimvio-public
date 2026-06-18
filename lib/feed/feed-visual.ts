import {
  isBrokenThumbnailUrl,
  resolveAmbienceThumbnail,
} from "@/lib/feed/link-brand-art";
import type { EnrichedLink } from "@/lib/enrichers/types";
import type { LinkRow } from "@/types/database";

export type FeedVisualMode = "brand" | "poster" | "thumb";

export type LinkVisualInput = Pick<
  LinkRow,
  "domain" | "thumbnail_url" | "original_url" | "visual_mode" | "source_type"
>;

export function isYouTubeDomain(domain: string, originalUrl?: string | null) {
  const target = `${domain} ${originalUrl ?? ""}`.toLowerCase();
  return /youtube|youtu\.be/i.test(target);
}

export function isYouTubeThumbnail(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  return /i\.ytimg\.com|ytimg\.com/i.test(url);
}

export function resolveFeedVisualMode(
  link: Pick<LinkRow, "domain" | "thumbnail_url" | "original_url">
): FeedVisualMode {
  const thumb = link.thumbnail_url;

  if (!thumb || isBrokenThumbnailUrl(thumb)) {
    return "brand";
  }

  if (isYouTubeDomain(link.domain, link.original_url) && isYouTubeThumbnail(thumb)) {
    return "thumb";
  }

  if (
    resolveAmbienceThumbnail({
      thumbnail_url: thumb,
      domain: link.domain,
    })
  ) {
    return "poster";
  }

  return "brand";
}

export function resolveFeedVisualModeForLink(link: LinkVisualInput): FeedVisualMode {
  if (
    link.visual_mode === "brand" ||
    link.visual_mode === "poster" ||
    link.visual_mode === "thumb"
  ) {
    return link.visual_mode;
  }

  return resolveFeedVisualMode(link);
}

export function buildVisualFieldsFromEnriched(enriched: EnrichedLink): {
  visual_mode: FeedVisualMode;
  source_type: EnrichedLink["source_type"];
} {
  const visual_mode = resolveFeedVisualMode({
    domain: enriched.domain,
    thumbnail_url: enriched.image,
    original_url: enriched.url,
  });

  return {
    visual_mode,
    source_type: enriched.source_type,
  };
}
