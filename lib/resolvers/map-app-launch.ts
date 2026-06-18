import type { MapApp } from "@/lib/preferences/map-app";
import {
  buildGoogleMapsNavigateHref,
  buildGoogleMapsSearchHref,
  buildKakaoMapSearchHref,
  buildKakaoMapSearchWebHref,
  buildNaverMapSearchHref,
  buildNaverMapSearchWebHref,
  isPlaceRelatedUrl,
} from "@/lib/resolvers/deep-links";
import { isDomesticMapPlace } from "@/lib/resolvers/place-map-region";
import { toActionFamily } from "@/lib/personalization/action-family";
import type { LinkActionItem, LinkRow } from "@/types/database";

export type MapLaunchContext = {
  query: string;
  sourceUrl: string;
  domestic: boolean;
  navigate: boolean;
};

function pickPlaceQuery(link: Pick<LinkRow, "original_url" | "title">, action?: LinkActionItem) {
  const payloadCopy =
    action?.payload && typeof action.payload === "object" && "copyText" in action.payload
      ? String((action.payload as { copyText?: string }).copyText ?? "").trim()
      : "";

  return (
    payloadCopy ||
    link.title?.trim() ||
    link.original_url.trim()
  );
}

export function isMapLaunchAction(
  action: LinkActionItem,
  link?: Pick<LinkRow, "original_url" | "title" | "category">
) {
  if (toActionFamily(action) !== "map_navigate") {
    return false;
  }

  if (link && isPlaceRelatedUrl(link.original_url)) {
    return true;
  }

  const haystack = `${action.label} ${action.href ?? ""}`;
  return /지도|map|길찾|navi|kakaomap|nmap|google\.com\/maps|maps\.google|map\.naver|map\.kakao/i.test(
    haystack
  );
}

export function resolveMapLaunchContext(
  link: Pick<LinkRow, "original_url" | "title" | "category">,
  action?: LinkActionItem
): MapLaunchContext {
  const query = pickPlaceQuery(link, action);
  const domestic = isDomesticMapPlace({
    sourceUrl: link.original_url,
    title: link.title,
    placeName: query,
  });
  const navigate = /길찾|navigate|dir\/\?|directions/i.test(
    `${action?.label ?? ""} ${action?.href ?? ""} ${link.original_url}`
  );

  return {
    query,
    sourceUrl: link.original_url,
    domestic,
    navigate,
  };
}

export function buildAppleMapsSearchHref(query: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(query.trim())}`;
}

export function buildAppleMapsNavigateHref(query: string) {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(query.trim())}`;
}

export function buildMapAppHref(app: MapApp, context: MapLaunchContext): string {
  const query = context.query.trim();

  if (app === "apple") {
    return context.navigate
      ? buildAppleMapsNavigateHref(query)
      : buildAppleMapsSearchHref(query);
  }

  if (app === "google") {
    if (context.navigate) {
      return buildGoogleMapsNavigateHref(context.sourceUrl);
    }

    if (/google\.com\/maps|maps\.google/i.test(context.sourceUrl)) {
      return context.sourceUrl;
    }

    return buildGoogleMapsSearchHref(query);
  }

  if (app === "naver") {
    return context.navigate
      ? buildNaverMapSearchHref(query)
      : buildNaverMapSearchHref(query);
  }

  return context.navigate
    ? buildKakaoMapSearchHref(query)
    : buildKakaoMapSearchWebHref(query);
}

export function buildMapAppFallbackHref(app: MapApp, context: MapLaunchContext): string | null {
  if (app === "naver") {
    return buildNaverMapSearchWebHref(context.query);
  }

  if (app === "kakao") {
    return buildKakaoMapSearchWebHref(context.query);
  }

  return null;
}

export function mapPrimaryLabel(context: MapLaunchContext) {
  return context.navigate ? "길찾기" : "지도에서 열기";
}

export function isEntityNavigateAction(action: LinkActionItem) {
  return action.payload?.entityNavigate === true;
}

export function resolveEntityNavigateContext(action: LinkActionItem): MapLaunchContext {
  const copyText =
    typeof action.payload?.copyText === "string" ? action.payload.copyText.trim() : "";
  const nameParam = action.href?.match(/[?&]name=([^&]+)/)?.[1];
  const addressParam = action.href?.match(/[?&]address=([^&]+)/)?.[1];
  const decodedName = nameParam ? decodeURIComponent(nameParam.replace(/\+/g, " ")) : "";
  const decodedAddress = addressParam
    ? decodeURIComponent(addressParam.replace(/\+/g, " "))
    : "";

  const query = copyText || [decodedName, decodedAddress].filter(Boolean).join(" ").trim() || action.label;

  return {
    query,
    sourceUrl: query,
    domestic: true,
    navigate: true,
  };
}

export function buildEntityNavigateHref(
  mapApp: MapApp,
  input: { placeName?: string | null; navAddress?: string | null }
) {
  const query = [input.placeName, input.navAddress].filter(Boolean).join(" ").trim();
  return buildMapAppHref(mapApp, {
    query: query || input.navAddress || input.placeName || "",
    sourceUrl: query || input.navAddress || input.placeName || "",
    domestic: true,
    navigate: true,
  });
}

export function entityNavigateLabel(mapApp: MapApp) {
  if (mapApp === "kakao") {
    return "카카오맵 길찾기";
  }
  if (mapApp === "naver") {
    return "네이버지도 길찾기";
  }
  if (mapApp === "apple") {
    return "Apple 지도 길찾기";
  }
  if (mapApp === "google") {
    return "Google 길찾기";
  }
  return "네비게이션";
}
