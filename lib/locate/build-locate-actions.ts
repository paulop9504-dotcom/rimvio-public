import { shortBranchLabel } from "@/lib/locate/branch-label";
import {
  buildBaeminPlaceSearchHref,
  buildNaverPlaceReviewHref,
} from "@/lib/locate/place-service-links";
import { buildNmapRouteHref } from "@/lib/locate/normalize-place-name";
import {
  buildNaverMapSearchHref,
  buildNaverMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import type { LocateActionResult, LocatePlaceResult } from "@/lib/locate/types";

const MAX_BRANCH_CHIPS = 3;
const MAX_SECONDARY = 6;

function branchRouteChip(place: LocatePlaceResult, brandHint: string) {
  const branch = shortBranchLabel(place.place_name, brandHint);
  return {
    label: `📍 ${branch}`,
    href: buildNmapRouteHref({
      lat: place.lat,
      lng: place.lng,
      placeName: place.place_name,
    }),
    copyText: place.formatted_address ?? place.place_name,
  };
}

export function buildLocateActions(input: {
  place: LocatePlaceResult;
  alternatePlaces?: LocatePlaceResult[];
  brandHint?: string;
  contextSignal?: string;
  reasoning_path?: string;
  confidence_score?: number;
  is_ocr_relied?: boolean;
}): LocateActionResult {
  const { place } = input;
  const brandHint = input.brandHint?.trim() || place.place_name;
  const labelPlace = place.place_name;
  const href = buildNmapRouteHref({
    lat: place.lat,
    lng: place.lng,
    placeName: labelPlace,
  });

  const context_signal =
    input.contextSignal?.trim() ||
    `📍 ${labelPlace}${place.formatted_address ? ` · ${place.formatted_address}` : ""}`;

  const alternates = (input.alternatePlaces ?? []).filter(
    (candidate) =>
      candidate.google_place_id !== place.google_place_id &&
      (candidate.lat !== place.lat || candidate.lng !== place.lng)
  );

  const branchChips = alternates
    .slice(0, MAX_BRANCH_CHIPS)
    .map((candidate) => branchRouteChip(candidate, brandHint));

  const baemin = buildBaeminPlaceSearchHref(labelPlace);

  const secondary_actions = [
    ...branchChips,
    {
      label: "🛵 배민에서 검색",
      href: baemin.href,
      copyText: labelPlace,
      fallbackHref: baemin.fallbackHref,
    },
    {
      label: "⭐ 네이버 리뷰",
      href: buildNaverPlaceReviewHref(labelPlace),
      copyText: labelPlace,
    },
    {
      label: "📋 주소 복사",
      href: "#copy-text",
      copyText: place.formatted_address ?? labelPlace,
    },
  ].slice(0, MAX_SECONDARY);

  return {
    context_signal,
    place_name: labelPlace,
    formatted_address: place.formatted_address,
    lat: place.lat,
    lng: place.lng,
    cached: place.cached,
    reasoning_path: input.reasoning_path,
    confidence_score: input.confidence_score,
    is_ocr_relied: input.is_ocr_relied,
    primary_action: {
      label: `🗺️ ${labelPlace} 길찾기`,
      href,
      copyText: place.formatted_address ?? labelPlace,
    },
    secondary_actions,
  };
}

/** Map search only — used when Places API is unavailable or returns no coords. */
export function buildLocateSearchFallback(input: {
  placeName: string;
  contextSignal?: string;
  reasoning_path?: string;
  confidence_score?: number;
  is_ocr_relied?: boolean;
}): LocateActionResult {
  const labelPlace = input.placeName.trim();
  const context_signal =
    input.contextSignal?.trim() || `📍 ${labelPlace} · 지도 검색`;
  const baemin = buildBaeminPlaceSearchHref(labelPlace);

  return {
    context_signal,
    place_name: labelPlace,
    formatted_address: null,
    lat: 0,
    lng: 0,
    cached: false,
    reasoning_path: input.reasoning_path,
    confidence_score: input.confidence_score,
    is_ocr_relied: input.is_ocr_relied ?? true,
    primary_action: {
      label: `🗺️ ${labelPlace} 길찾기`,
      href: buildNaverMapSearchHref(labelPlace),
      copyText: labelPlace,
    },
    secondary_actions: [
      {
        label: "🗺️ 네이버 지도 웹",
        href: buildNaverMapSearchWebHref(labelPlace),
        copyText: labelPlace,
      },
      {
        label: "🛵 배민에서 검색",
        href: baemin.href,
        copyText: labelPlace,
        fallbackHref: baemin.fallbackHref,
      },
      {
        label: "⭐ 네이버 리뷰",
        href: buildNaverPlaceReviewHref(labelPlace),
        copyText: labelPlace,
      },
    ],
  };
}
