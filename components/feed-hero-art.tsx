"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";
import { LINK_CATEGORY_LABELS } from "@/lib/categories/types";
import { isCommerceDomain } from "@/lib/enrichers/url-intelligence";
import {
  faviconUrl,
  resolveAmbienceThumbnail,
  resolveBrandInitial,
  resolveLinkBrand,
} from "@/lib/feed/link-brand-art";
import {
  isYouTubeDomain,
  isYouTubeThumbnail,
  resolveFeedVisualModeForLink,
} from "@/lib/feed/feed-visual";
import { isScreenshotLink } from "@/lib/share/ingest-screenshot";
import type { LinkRow } from "@/types/database";
import { cn } from "@/lib/utils";

type FeedHeroArtProps = {
  link: LinkRow;
  className?: string;
  /** cover = full-bleed capture canvas (no play button) */
  layout?: "default" | "cover";
};

/** iOS squircle app icon */
function AppIconMark({
  domain,
  emoji,
  initial,
  useFavicon,
  size = "hero",
}: {
  domain: string;
  emoji: string;
  initial: string;
  useFavicon: boolean;
  size?: "hero" | "compact";
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const isHero = size === "hero";
  const showFavicon = useFavicon && !faviconFailed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-white",
        "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06]",
        isHero ? "size-[4.75rem] rounded-[22%]" : "size-10 rounded-[22%]"
      )}
    >
      {showFavicon ? (
        <Image
          src={faviconUrl(domain, isHero ? 128 : 64)}
          alt=""
          width={isHero ? 52 : 22}
          height={isHero ? 52 : 22}
          className={cn("object-contain", isHero ? "size-[2.65rem]" : "size-5")}
          unoptimized
          onError={() => setFaviconFailed(true)}
        />
      ) : (
        <span className={cn("leading-none", isHero ? "text-3xl" : "text-sm")}>
          {emoji || initial}
        </span>
      )}
    </div>
  );
}

function FeedCoverArt({
  link,
  className,
}: {
  link: LinkRow;
  className?: string;
}) {
  const thumb = link.thumbnail_url!;

  return (
    <div className={cn("relative size-full overflow-hidden bg-[#111]", className)}>
      <Image
        src={thumb}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 448px) 100vw, 448px"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
    </div>
  );
}

function YouTubeThumbCard({
  link,
  className,
}: {
  link: LinkRow;
  className?: string;
}) {
  const thumb = link.thumbnail_url!;

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden rounded-[22px]",
        "bg-[#1c1c1e] ring-1 ring-black/[0.04]",
        className
      )}
    >
      <Image
        src={thumb}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 448px) 100vw, 448px"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-white/95 shadow-lg backdrop-blur-sm">
          <Play className="ml-0.5 size-6 fill-[#1c1c1e] text-[#1c1c1e]" />
        </span>
      </div>
    </div>
  );
}

function resolveHeroHeadline(link: LinkRow, brandDisplayName: string) {
  if (
    (link.source_type === "commerce" || isCommerceDomain(link.domain)) &&
    link.title?.trim() &&
    link.title.trim().length >= 4
  ) {
    const trimmed = link.title.trim();
    return trimmed.length > 44 ? `${trimmed.slice(0, 44)}…` : trimmed;
  }

  return brandDisplayName;
}

function BrandHeroArt({
  link,
  withAmbience,
  className,
}: {
  link: LinkRow;
  withAmbience: boolean;
  className?: string;
}) {
  const brand = resolveLinkBrand(link);
  const ambience = withAmbience ? resolveAmbienceThumbnail(link) : null;
  const initial = resolveBrandInitial(link.domain);
  const categoryLabel = LINK_CATEGORY_LABELS[brand.category];
  const headline = resolveHeroHeadline(link, brand.displayName);

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden rounded-[22px]",
        "bg-[#eef0f4] ring-1 ring-black/[0.04]",
        className
      )}
    >
      {ambience ? (
        <>
          <Image
            src={ambience}
            alt=""
            fill
            className="object-cover opacity-90 saturate-[0.85]"
            sizes="(max-width: 448px) 100vw, 448px"
            unoptimized
          />
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
        </>
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-[0.14]",
            brand.gradient
          )}
        />
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
        <AppIconMark
          domain={link.domain}
          emoji={brand.emoji}
          initial={initial}
          useFavicon
          size="hero"
        />
        <div className="text-center">
          <p className="line-clamp-2 text-[15px] font-semibold tracking-tight text-foreground/90">
            {headline}
          </p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {headline === brand.displayName ? categoryLabel : brand.displayName}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FeedHeroArt({
  link,
  className,
  layout = "default",
}: FeedHeroArtProps) {
  const mode = resolveFeedVisualModeForLink(link);
  const thumb = link.thumbnail_url?.trim();

  if (layout === "cover" && thumb) {
    return <FeedCoverArt link={link} className={className} />;
  }

  if (
    thumb &&
    isYouTubeDomain(link.domain, link.original_url) &&
    isYouTubeThumbnail(thumb)
  ) {
    return <YouTubeThumbCard link={link} className={className} />;
  }

  if (thumb && isScreenshotLink(link)) {
    return <FeedCoverArt link={link} className={className} />;
  }

  return (
    <BrandHeroArt
      link={link}
      withAmbience={mode === "poster" && Boolean(thumb)}
      className={className}
    />
  );
}

export function LinkBrandMark({
  link,
  className,
}: {
  link: Pick<LinkRow, "domain" | "category" | "thumbnail_url" | "source_type">;
  className?: string;
}) {
  const brand = resolveLinkBrand(link);
  const initial = resolveBrandInitial(link.domain);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const showFavicon = brand.useFavicon && !faviconFailed;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[22%]",
        "bg-white ring-1 ring-black/[0.06]",
        className
      )}
    >
      <div className="flex size-full items-center justify-center bg-[#eef0f4]">
        {showFavicon ? (
          <Image
            src={faviconUrl(link.domain, 64)}
            alt=""
            width={22}
            height={22}
            className="size-[1.35rem] object-contain"
            unoptimized
            onError={() => setFaviconFailed(true)}
          />
        ) : (
          <span className="text-sm leading-none">{brand.emoji || initial}</span>
        )}
      </div>
    </div>
  );
}
