import {
  extractUrlsFromText,
  hostnameFromUrl,
} from "@/lib/enrichers/extract-urls";
import { createOpenAction } from "@/lib/enrichers/action-factory";
import { fetchYouTubeOEmbed } from "@/lib/enrichers/fetch-youtube-oembed";
import { fetchYouTubeDescription } from "@/lib/enrichers/fetch-youtube-description";
import {
  fetchPageMetadata,
  withDomainFallback,
} from "@/lib/enrichers/fetch-page-metadata";
import {
  formatYouTubeTimestamp,
  parseYouTubeStartSeconds,
} from "@/lib/enrichers/url-intelligence";
import { buildYouTubeAppHref } from "@/lib/resolvers/deep-links";
import {
  isYouTubeShortsUrl,
  normalizeYouTubeUrl,
} from "@/lib/enrichers/youtube-url";
import type { EnrichedLink, Enricher, EnricherContext } from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

export { isYouTubeDomain, normalizeYouTubeUrl } from "@/lib/enrichers/youtube-url";

const MAX_ACTIONS = 5;
const TIMESTAMP_REGEX = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;

function parseTimestampToSeconds(value: string) {
  const parts = value.split(":").map((part) => Number(part));

  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return null;
}

function withYouTubeTimestamp(videoUrl: string, seconds: number) {
  const url = new URL(normalizeYouTubeUrl(videoUrl));
  url.searchParams.set("t", `${seconds}s`);
  return url.href;
}

function extractTimestampActions(
  videoUrl: string,
  description: string | null,
  urlStartSeconds: number | null
): LinkActionItem[] {
  const seen = new Set<number>();
  const actions: LinkActionItem[] = [];

  if (urlStartSeconds !== null && urlStartSeconds > 0) {
    seen.add(urlStartSeconds);
    const stamp = formatYouTubeTimestamp(urlStartSeconds);
    actions.push(
      createOpenAction({
        label: `⏱ ${stamp}부터 재생`,
        href: withYouTubeTimestamp(videoUrl, urlStartSeconds),
        icon: "timestamp",
        copyText: stamp,
      })
    );
  }

  if (!description?.trim()) {
    return actions.slice(0, 2);
  }

  for (const match of description.matchAll(TIMESTAMP_REGEX)) {
    const stamp = match[1];
    const seconds = parseTimestampToSeconds(stamp);

    if (seconds === null || seen.has(seconds)) {
      continue;
    }

    seen.add(seconds);

    actions.push(
      createOpenAction({
        label: `⏱ ${stamp} 구간 재생`,
        href: withYouTubeTimestamp(videoUrl, seconds),
        icon: "timestamp",
        copyText: stamp,
      })
    );

    if (actions.length >= 2) {
      break;
    }
  }

  return actions;
}

function extractLinkActions(
  videoUrl: string,
  description: string | null,
  limit: number
): LinkActionItem[] {
  if (!description?.trim() || limit <= 0) {
    return [];
  }

  const normalizedVideo = normalizeYouTubeUrl(videoUrl);

  return extractUrlsFromText(description)
    .filter((href) => {
      const normalized = href.replace(/\/$/, "");
      return (
        normalized !== normalizedVideo.replace(/\/$/, "") &&
        !normalized.includes("youtube.com/watch")
      );
    })
    .slice(0, limit)
    .map((href, index, list) =>
      createOpenAction({
        label:
          list.length === 1
            ? `🔗 ${hostnameFromUrl(href)}`
            : `🔗 링크 ${index + 1} · ${hostnameFromUrl(href)}`,
        href,
        icon: "link",
        copyText: href,
      })
    );
}

function buildYouTubeActions(
  rawUrl: string,
  videoUrl: string,
  description: string | null,
  title: string | null
) {
  const normalizedUrl = normalizeYouTubeUrl(videoUrl);
  const isShorts = isYouTubeShortsUrl(rawUrl);
  const urlStartSeconds = parseYouTubeStartSeconds(rawUrl);
  const copyTitle = title?.trim() || null;

  const primary = createOpenAction({
    label: isShorts ? "📺 Shorts 보기" : "▶️ 영상 바로 재생",
    href: urlStartSeconds
      ? withYouTubeTimestamp(normalizedUrl, urlStartSeconds)
      : normalizedUrl,
    icon: "youtube",
    copyText: copyTitle,
  });

  const secondary: LinkActionItem[] = [];
  const youtubeAppHref = buildYouTubeAppHref(rawUrl);

  if (youtubeAppHref) {
    secondary.push(
      createOpenAction({
        label: "📱 YouTube 앱으로",
        href: youtubeAppHref,
        icon: "youtube",
        copyText: copyTitle,
        contextBoost: "installed-app",
      })
    );
  }

  const timestamps = extractTimestampActions(
    normalizedUrl,
    description,
    urlStartSeconds
  );
  const remaining = MAX_ACTIONS - 1 - secondary.length - timestamps.length;
  const links = extractLinkActions(normalizedUrl, description, remaining);

  return [primary, ...secondary, ...timestamps, ...links].slice(0, MAX_ACTIONS);
}

export const youtubeEnricher: Enricher = {
  id: "youtube-v1",
  domains: ["youtube.com", "youtu.be", "m.youtube.com"],

  async enrich(
    rawUrl: string,
    _context: EnricherContext
  ): Promise<EnrichedLink> {
    const normalizedUrl = normalizeYouTubeUrl(rawUrl);
    const [oembed, metadata, scrapedDescription] = await Promise.all([
      fetchYouTubeOEmbed(rawUrl),
      fetchPageMetadata(normalizedUrl),
      fetchYouTubeDescription(rawUrl),
    ]);

    const title = oembed?.title ?? metadata.title;
    const image = oembed?.thumbnail_url ?? metadata.image;
    const description = scrapedDescription ?? metadata.description;

    const normalized = withDomainFallback(
      { url: normalizedUrl, domain: "youtube.com", title, image, description, phone: metadata.phone },
      { title, image, description }
    );

    const actions = buildYouTubeActions(
      rawUrl,
      normalized.url,
      normalized.description,
      normalized.title
    );

    return {
      url: normalizeYouTubeUrl(normalized.url),
      domain: "youtube.com",
      title: normalized.title,
      image: normalized.image,
      description: normalized.description,
      actions,
      enricher_id: "youtube-v1",
      source_type: "youtube",
      fallback: {
        ...normalized.fallback,
        titleFromDomain: !title?.trim(),
        imageFromFallback: !image?.trim(),
      },
    };
  },
};
