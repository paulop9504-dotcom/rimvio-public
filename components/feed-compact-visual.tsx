"use client";

import { FeedHeroArt } from "@/components/feed-hero-art";
import { FeedLinkChip } from "@/components/feed-link-chip";
import {
  isYouTubeDomain,
  isYouTubeThumbnail,
} from "@/lib/feed/feed-visual";
import type { LinkRow } from "@/types/database";

/** Compact feed visual ??chip for portal links, thumbnail for YouTube. */
export function FeedCompactVisual({ link }: { link: LinkRow }) {
  const thumb = link.thumbnail_url?.trim();
  const showYouTube =
    Boolean(thumb) &&
    isYouTubeDomain(link.domain, link.original_url) &&
    isYouTubeThumbnail(thumb);

  if (showYouTube) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-[22px] ring-1 ring-rimvio-neon-purple/12">
        <FeedHeroArt link={link} className="size-full" />
      </div>
    );
  }

  return <FeedLinkChip link={link} />;
}
