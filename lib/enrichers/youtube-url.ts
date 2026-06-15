import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

export function isYouTubeDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");
  return normalized === "youtu.be" || normalized.endsWith("youtube.com");
}

function preserveWatchParams(source: URL, target: URL) {
  for (const key of ["t", "start", "list", "si", "feature"]) {
    const value = source.searchParams.get(key);
    if (value) {
      target.searchParams.set(key, value);
    }
  }
}

function watchUrlFromVideoId(videoId: string, source: URL) {
  const watch = new URL(`https://www.youtube.com/watch?v=${videoId}`);
  preserveWatchParams(source, watch);
  return watch.href;
}

export function normalizeYouTubeUrl(rawUrl: string) {
  const parsed = normalizeInputUrl(rawUrl);
  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const videoId = parsed.pathname.replace(/^\//, "").split("/")[0];
    if (videoId) {
      return watchUrlFromVideoId(videoId, parsed);
    }
  }

  for (const prefix of ["/shorts/", "/embed/", "/live/", "/v/"]) {
    if (parsed.pathname.startsWith(prefix)) {
      const videoId = parsed.pathname.split("/")[2];
      if (videoId) {
        return watchUrlFromVideoId(videoId, parsed);
      }
    }
  }

  if (host.endsWith("youtube.com") && parsed.pathname === "/watch") {
    const videoId = parsed.searchParams.get("v");
    if (videoId) {
      return watchUrlFromVideoId(videoId, parsed);
    }
  }

  return parsed.href;
}

export function isYouTubeShortsUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    return parsed.pathname.startsWith("/shorts/");
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(normalizeYouTubeUrl(rawUrl));
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) {
      return fromQuery;
    }

    for (const prefix of ["/shorts/", "/embed/", "/live/", "/v/"]) {
      if (parsed.pathname.startsWith(prefix)) {
        return parsed.pathname.split("/")[2] ?? null;
      }
    }

    if (parsed.hostname.replace(/^www\./, "") === "youtu.be") {
      return parsed.pathname.replace(/^\//, "").split("/")[0] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}
