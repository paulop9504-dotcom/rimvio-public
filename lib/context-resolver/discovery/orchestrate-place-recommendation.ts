import type { OrchestratorResult } from "@/lib/action-chat/orchestrator-types";
import {
  compilePlaceDiscovery,
  formatPlaceDiscoveryHeadline,
} from "@/lib/context-resolver/discovery/compile-place-discovery";
import { enrichPlaceDiscoveryMessage } from "@/lib/context-resolver/discovery/enrich-place-discovery-message";
import {
  buildPlaceDiscoveryCriteria,
  parseFindPlaceIntent,
} from "@/lib/context-resolver/discovery/parse-find-place-intent";
import type { OrchestrateHistoryTurn } from "@/lib/action-chat/orchestrator-types";
import { queryNearbyPlaces } from "@/lib/context-resolver/places/query-nearby-places";
import { enrichPlaceCandidates } from "@/lib/context-resolver/places/rank-place-candidates";
import { rankPlaceCandidatesByCuisine } from "@/lib/context-resolver/places/rank-by-cuisine-relevance";
import { filterRestaurantCandidates } from "@/lib/context-resolver/places/filter-restaurant-candidates";
import { filterCafeCandidates } from "@/lib/context-resolver/places/filter-cafe-candidates";
import { rankPlaceCandidatesByMemory, memoryHighlightForPlace } from "@/lib/context-resolver/places/rank-by-memory-relevance";
import { inferExperienceMode } from "@/lib/experience/infer-experience-mode";
import { resolvePlacePreference } from "@/lib/context-resolver/places/place-preference";
import type { PlaceCandidate, PlaceDiscoveryContext } from "@/lib/context-resolver/places/types";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { fetchNaverLocalPlaceCandidates } from "@/lib/naver/local-to-place-candidate";
import { attachPlaceThumbnails } from "@/lib/places/fetch-place-thumbnails";

const DEFAULT_ORIGIN = { lat: 36.3504, lng: 127.3845 };

async function resolveOrigin(): Promise<{ lat: number; lng: number }> {
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4000,
          maximumAge: 60_000,
        });
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch {
      // fall through
    }
  }

  return DEFAULT_ORIGIN;
}

async function loadCandidates(input: {
  naverQuery: string;
  criteria: ReturnType<typeof buildPlaceDiscoveryCriteria>;
  origin: { lat: number; lng: number };
  fetchMultiplier?: number;
}): Promise<PlaceCandidate[]> {
  const display = Math.max(
    input.criteria.max_results * (input.fetchMultiplier ?? 2),
    input.fetchMultiplier && input.fetchMultiplier >= 4 ? 15 : 8
  );

  if (isNaverSearchConfigured()) {
    const fromNaver = await fetchNaverLocalPlaceCandidates({
      query: input.naverQuery,
      display,
    });
    if (fromNaver.length > 0) {
      return fromNaver;
    }
  }

  return queryNearbyPlaces({
    lat: input.origin.lat,
    lng: input.origin.lng,
    criteria: input.criteria,
  });
}

export async function orchestratePlaceRecommendation(
  message: string,
  options?: { history?: readonly OrchestrateHistoryTurn[] }
): Promise<OrchestratorResult | null> {
  const enriched = enrichPlaceDiscoveryMessage(message, options?.history);
  const event = parseFindPlaceIntent(enriched);
  if (!event) {
    return null;
  }

  const experienceMode = inferExperienceMode(enriched);
  const skipRestaurantFilter =
    experienceMode === "MEMORY" &&
    /아이스크림|디저트|간식|카페|분위기|뷰/u.test(enriched);

  const criteria = buildPlaceDiscoveryCriteria(event);
  const origin = await resolveOrigin();
  const rawCandidates = await loadCandidates({
    naverQuery: event.naverQuery,
    criteria,
    origin,
    fetchMultiplier: event.category === "restaurant" || event.category === "cafe" ? 4 : 2,
  });

  const diningFiltered =
    event.category === "restaurant" && !skipRestaurantFilter
      ? filterRestaurantCandidates(rawCandidates, event.raw_message)
      : event.category === "cafe"
        ? filterCafeCandidates(rawCandidates, event.raw_message, criteria.max_results * 2)
        : rawCandidates;

  if (diningFiltered.length === 0) {
    const label =
      event.category === "activity"
        ? "놀거리"
        : event.cuisine ?? (event.category === "restaurant" ? "맛집" : "카페");
    const where = event.anchor ? `${event.anchor} 근처 ` : "";
    return {
      summary: `${where}${label}을 찾지 못했어요. 검색어를 조금 바꿔볼까요?`,
      actions: [],
      source: "rules",
      confidence: 0.72,
      actionsRevealed: true,
      metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
    };
  }

  const searchOrigin =
    event.anchor && diningFiltered[0]
      ? { lat: diningFiltered[0].lat, lng: diningFiltered[0].lng }
      : origin;

  const preference = await resolvePlacePreference({ vibe: event.vibe });
  let ranked = rankPlaceCandidatesByCuisine(
    diningFiltered,
    event.cuisine ?? event.activity
  );
  if (event.category === "cafe") {
    ranked = filterCafeCandidates(ranked, event.raw_message, criteria.max_results * 2);
  }
  if (experienceMode === "MEMORY") {
    ranked = rankPlaceCandidatesByMemory(ranked);
  }

  if (ranked.length === 0 && event.cuisine) {
    if (diningFiltered.length > 0) {
      ranked = diningFiltered;
    } else {
      const label = event.cuisine;
      const where = event.anchor ? `${event.anchor} 근처 ` : "";
      return {
        summary: `${where}${label} 전문점을 찾지 못했어요. 검색어를 조금 바꿔볼까요?`,
        actions: [],
        source: "rules",
        confidence: 0.72,
        actionsRevealed: true,
        metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
      };
    }
  }
  const memoryNote =
    experienceMode === "MEMORY" && ranked[0]
      ? memoryHighlightForPlace(ranked[0])
      : null;
  const withThumbnails = await attachPlaceThumbnails(
    ranked.slice(0, criteria.max_results),
    { anchor: event.anchor, cuisine: event.cuisine }
  );
  const candidates = enrichPlaceCandidates({
    candidates: withThumbnails,
    origin: searchOrigin,
    criteria,
    preference,
  }).filter((place) => place.travel_minutes <= 90);

  const nearbyCandidates =
    candidates.length > 0
      ? candidates
      : enrichPlaceCandidates({
          candidates: withThumbnails,
          origin: searchOrigin,
          criteria,
          preference,
        })
          .sort((a, b) => a.travel_minutes - b.travel_minutes)
          .slice(0, criteria.max_results);

  const placeContext: PlaceDiscoveryContext = {
    criteria,
    candidates: nearbyCandidates,
    preference,
  };

  const categoryLabel =
    event.category === "activity"
      ? "놀거리"
      : event.cuisine ?? (event.category === "restaurant" ? "맛집" : "카페");

  const { wire, actions } = compilePlaceDiscovery(placeContext, {
    categoryLabel,
    anchor: event.anchor,
  });

  return {
    summary: formatPlaceDiscoveryHeadline(wire),
    actions,
    source: isNaverSearchConfigured() ? "rules" : "rules",
    confidence: 0.93,
    actionsRevealed: true,
    pendingConfirm: false,
    cafeDiscovery: wire,
    thought: `Naver local · ${event.naverQuery} · ${candidates.length}건 · ${experienceMode}${memoryNote ? ` · ${memoryNote}` : ""}`,
    metadata: { intent: "ACTION", trust_level_adjustment: "NONE" },
  };
}

/** @deprecated use orchestratePlaceRecommendation */
export async function orchestrateCafeDiscovery(message: string): Promise<OrchestratorResult | null> {
  return orchestratePlaceRecommendation(message);
}

export {
  parseFindPlaceIntent,
  isPlaceRecommendationQuery,
  isFindCafeQuery,
} from "@/lib/context-resolver/discovery/parse-find-place-intent";
