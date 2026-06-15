import { RIMVIO } from "@/lib/brand/rimvio";
import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";
import { normalizeYouTubeUrl } from "@/lib/enrichers/youtube-url";
import {
  resolveSearchIntentFromDeeplink,
  resolveSearchQuery,
} from "@/lib/search-intent/resolve-search-intent";
import type { LinkActionItem } from "@/types/database";

const PLACE_URL_PATTERN =
  /map\.kakao|place\.map|map\.naver|naver\.me|google\.com\/maps|maps\.google|\/place\/|\/maps\/|dorojuso\.kr|juso\.go\.kr/i;

export function isPlaceRelatedUrl(url: string) {
  return PLACE_URL_PATTERN.test(url);
}

export function buildKakaoMapHref(sourceUrl: string) {
  if (/map\.kakao/i.test(sourceUrl)) {
    return sourceUrl;
  }

  return `https://map.kakao.com/link/map/${encodeURIComponent(sourceUrl)}`;
}

export function buildKakaoMapSearchHref(query: string) {
  const resolved = resolveSearchQuery({ text: query });
  const q = encodeURIComponent(resolved.trim());
  return `kakaomap://search?q=${q}`;
}

export function buildKakaoMapSearchWebHref(query: string) {
  const resolved = resolveSearchQuery({ text: query });
  const q = encodeURIComponent(resolved.trim());
  return `http://m.map.kakao.com/scheme/search?q=${q}`;
}

/** Kakao Map route deeplink — ep is lat,lng (Kakao mobile scheme). */
export function buildKakaoMapRouteHref(input: {
  lat: number;
  lng: number;
  placeLabel?: string | null;
}) {
  const ep = `${input.lat},${input.lng}`;
  return `kakaomap://route?ep=${encodeURIComponent(ep)}&by=CAR`;
}

export function buildKakaoMapRouteWebHref(input: {
  lat: number;
  lng: number;
  placeLabel?: string | null;
}) {
  const name = input.placeLabel?.trim();
  if (name) {
    return buildKakaoMapSearchWebHref(name);
  }
  return `https://map.kakao.com/link/map/${input.lat},${input.lng}`;
}

export function buildNaverMapSearchHref(query: string) {
  const resolved = resolveSearchQuery({ text: query });
  const q = encodeURIComponent(resolved.trim());
  return `nmap://search?query=${q}&appname=${encodeURIComponent(RIMVIO.name)}`;
}

export function buildNaverMapSearchWebHref(query: string) {
  const resolved = resolveSearchQuery({ text: query });
  const q = encodeURIComponent(resolved.trim());
  return `https://map.naver.com/p/search/${q}`;
}

export function buildKakaoMapAction(
  sourceUrl: string,
  copyText?: string | null
): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "open",
    label: "카카오맵 바로 열기",
    href: buildKakaoMapHref(sourceUrl),
    payload: {
      icon: "kakaomap",
      contextBoost: "installed-app",
      ...(copyText?.trim() ? { copyText: copyText.trim() } : {}),
    },
  };
}

export function buildKakaoMapSearchAction(
  query: string
): LinkActionItem {
  return {
    id: crypto.randomUUID(),
    kind: "open",
    label: `🗺 ${query.trim().slice(0, 10)} 검색`,
    href: buildKakaoMapSearchHref(query),
    payload: {
      icon: "kakaomap",
      copyText: query.trim(),
      contextBoost: "installed-app",
    },
  };
}

export function buildNaverMapSearchAction(query: string): LinkActionItem {
  const place = query.trim();
  return {
    id: crypto.randomUUID(),
    kind: "open",
    label: `📍 네이버지도 · ${place.slice(0, 12)}`,
    href: buildNaverMapSearchHref(place),
    payload: {
      icon: "map",
      copyText: place,
      contextBoost: "installed-app",
      fallbackHref: buildNaverMapSearchWebHref(place),
    },
  };
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(normalizeYouTubeUrl(rawUrl));
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || null;
    }

    if (parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.split("/")[2] ?? null;
    }

    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

export function buildYouTubeAppHref(rawUrl: string): string | null {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) {
    return null;
  }

  const parsed = normalizeInputUrl(normalizeYouTubeUrl(rawUrl));
  const start = parsed.searchParams.get("t") ?? parsed.searchParams.get("start");
  const suffix = start ? `&t=${encodeURIComponent(start)}` : "";

  return `youtube://watch?v=${videoId}${suffix}`;
}

export function buildGoogleMapsNavigateHref(sourceUrl: string) {
  return buildGoogleMapsDirectionHref(sourceUrl, "driving");
}

export type GoogleMapsTravelMode = "driving" | "walking" | "transit" | "bicycling";

export function buildGoogleMapsDirectionHref(
  sourceUrl: string,
  travelMode: GoogleMapsTravelMode = "driving"
) {
  try {
    const parsed = new URL(sourceUrl);
    const destination = `${parsed.pathname}${parsed.search}`;

    if (/google\.com\/maps/i.test(sourceUrl)) {
      const params = new URLSearchParams(parsed.search);
      const query = params.get("q") ?? params.get("query") ?? destination;

      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=${travelMode}`;
    }

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sourceUrl)}&travelmode=${travelMode}`;
  } catch {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sourceUrl)}&travelmode=${travelMode}`;
  }
}

export function buildGoogleMapsSearchHref(query: string) {
  const resolved = resolveSearchQuery({ text: query });
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resolved.trim())}`;
}

/** Expand deeplink search seed → ranked query (intent resolver, not URL parser). */
export function resolveMapSearchQueryFromHref(href: string, context?: string) {
  return resolveSearchIntentFromDeeplink(href, context);
}

export function buildGoogleEarthHref(
  query: string,
  coords?: { lat: number; lng: number } | null
) {
  const place = query.trim();
  if (coords) {
    return `https://earth.google.com/web/@${coords.lat},${coords.lng},800a,500d,35y,0h,0t,0r`;
  }

  return `https://earth.google.com/web/search/${encodeURIComponent(place)}`;
}

export function buildGoogleMapsOpenAction(
  sourceUrl: string,
  placeName?: string | null
): LinkActionItem {
  const place = placeName?.trim() || null;
  const href = /google\.com\/maps|maps\.google/i.test(sourceUrl)
    ? sourceUrl
    : place
      ? buildGoogleMapsSearchHref(place)
      : sourceUrl;

  return {
    id: crypto.randomUUID(),
    kind: "open",
    label: place ? `Google 지도 · ${place.slice(0, 16)}` : "Google 지도에서 열기",
    href,
    payload: {
      icon: "map",
      ...(place ? { copyText: place } : {}),
    },
  };
}

export function buildGoogleEarthAction(
  query: string,
  coords?: { lat: number; lng: number } | null
): LinkActionItem {
  const place = query.trim();
  return {
    id: crypto.randomUUID(),
    kind: "open",
    label: "Google Earth에서 보기",
    href: buildGoogleEarthHref(place, coords),
    payload: {
      icon: "map",
      copyText: place,
    },
  };
}

export function parseGitHubCopyLabel(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)\/([^/]+)(?:\/(pull|issues)\/(\d+))?/i);
  if (!match) {
    return null;
  }

  const [, owner, repo, kind, number] = match;
  if (kind && number) {
    return `${owner}/${repo}#${kind === "pull" ? "PR" : "issue"}-${number}`;
  }

  return `${owner}/${repo}`;
}
