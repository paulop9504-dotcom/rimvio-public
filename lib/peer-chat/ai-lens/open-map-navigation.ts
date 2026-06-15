import {
  buildKakaoMapSearchHref,
  buildKakaoMapSearchWebHref,
  buildNaverMapSearchHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import { hasInstalledApp } from "@/lib/enrichers/context";
import { normalizeEnricherContext } from "@/lib/enrichers/context";

export type MapProvider = "kakao" | "naver" | "google";

export function buildGoogleMapSearchHref(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
}

export function preferredMapProvider(): MapProvider {
  const ctx = normalizeEnricherContext({ hour: new Date().getHours() });
  if (hasInstalledApp(ctx, "kakaomap")) {
    return "kakao";
  }
  return "naver";
}

export function openMapProvider(place: string, provider: MapProvider): void {
  if (typeof window === "undefined") {
    return;
  }
  const q = place.trim();
  let href: string;
  switch (provider) {
    case "kakao":
      href = hasInstalledApp(normalizeEnricherContext({ hour: new Date().getHours() }), "kakaomap")
        ? buildKakaoMapSearchHref(q)
        : buildKakaoMapSearchWebHref(q);
      break;
    case "google":
      href = buildGoogleMapSearchHref(q);
      break;
    default:
      href = buildNaverMapSearchWebHref(q);
      break;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

export function mapProviderLabel(provider: MapProvider): string {
  switch (provider) {
    case "kakao":
      return "카카오맵";
    case "google":
      return "구글 지도";
    default:
      return "네이버 지도";
  }
}
