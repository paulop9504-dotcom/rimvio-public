import { resolveNavigationPlaceName } from "@/lib/action-chat/resolve-navigation-place";
import { extractCuisineKeyword } from "@/lib/context-resolver/discovery/extract-cuisine-keyword";
import {
  activityNaverSearchLabel,
  extractActivityKeyword,
  isActivityDiscoveryQuery,
  isDiscoveryPhrase,
} from "@/lib/context-resolver/discovery/extract-activity-keyword";
import type { FindPlaceIntent, PlaceDiscoveryCriteria, PlaceVibe } from "@/lib/context-resolver/places/types";
import { diningSearchLabel } from "@/lib/context-resolver/places/filter-restaurant-candidates";

export type FindCafeEvent = {
  intent: FindPlaceIntent;
  vibe: PlaceVibe;
  raw_message: string;
};

export type PlaceDiscoveryCategory = "cafe" | "restaurant" | "activity";

export type FindPlaceEvent = {
  intent: FindPlaceIntent;
  category: PlaceDiscoveryCategory;
  vibe: PlaceVibe;
  cuisine: string | null;
  activity: string | null;
  naverQuery: string;
  anchor: string | null;
  raw_message: string;
};

const FIND_CAFE =
  /(?:지금\s*)?(?:갈\s*만한\s*)?(?:조용한\s*)?(?:근처\s*)?(?:카페|coffee)(?:\s*(?:추천|찾|알려|골라|없|있|해\s*줘|해줘))|(카페|coffee).*(?:추천|찾)|근처\s*카페/iu;

const FIND_DINING =
  /(?:맛집|식당|레스토랑|음식점|치킨집|분식집|떡볶이집|먹을\s*곳|한식|양식|술집|밥\s*집).*(?:추천|찾|알려|골라|해\s*줘|검색|찾기|있|없)/iu;

const DINING_SEARCH =
  /(?:맛집|식당|레스토랑|음식점|카페).*(?:검색|찾기|찾아)|(?:검색|찾기|찾아).*(?:맛집|식당|레스토랑|음식점)/iu;

const BARE_DINING_SEARCH = /^맛집\s*(?:검색|찾기|찾아)/iu;

const RECOMMEND_THEN_DINING =
  /(?:추천|찾|알려|골라).*(?:맛집|식당|레스토랑|먹을\s*곳)/iu;

const NEARBY_ANCHOR =
  /([가-힣A-Za-z0-9]{2,14}(?:역|동|구|시|터미널|공항|대학교|몰|마트|백화점))\s*(?:근처|주변|부근|앞|옆|쪽)/iu;

const KOREAN_CITY =
  /(?:^|\s)(서울|부산|대구|인천|광주|대전|울산|세종|제주|수원|성남|고양|용인|창원|청주|전주|천안|안산|김포|파주|춘천|강릉|여수|순천|포항|경주)(?:시|역)?(?:\s|$)/iu;

const METRO_CITY = /(서울|부산|대구|인천|광주|대전|울산)광역시/iu;

function isCafeOnlyCuisine(cuisine: string): boolean {
  return /^(?:디저트|베이커리|빙수|빵)$/iu.test(cuisine);
}

const RECOMMENDATION_TAIL =
  /(?:추천|찾아|찾|알려|골라|해\s*줘|해줘|좀|부탁|있|없)(?:\s*[!?.~ㅋㅎ]*)*$/iu;

/** e.g. "둔산동 맛집", "강남역 맛집" — no explicit recommend verb required. */
const ANCHOR_DINING =
  /^([가-힣A-Za-z0-9]{2,14}(?:동|역|구|시|터미널|공항|대학교|몰|마트|백화점))\s+맛집\s*$/iu;

export function isFindCafeQuery(message: string): boolean {
  return FIND_CAFE.test(message.trim());
}

/** Discovery beats execution — recommend / outing queries. */
export function isPlaceRecommendationQuery(message: string): boolean {
  const trimmed = message.trim();
  return (
    isFindCafeQuery(trimmed) ||
    isActivityDiscoveryQuery(trimmed) ||
    FIND_DINING.test(trimmed) ||
    DINING_SEARCH.test(trimmed) ||
    BARE_DINING_SEARCH.test(trimmed) ||
    RECOMMEND_THEN_DINING.test(trimmed) ||
    ANCHOR_DINING.test(trimmed) ||
    (extractCuisineKeyword(trimmed) !== null &&
      /추천|찾|알려|골라|해\s*줘|검색/u.test(trimmed))
  );
}

function stripRecommendationTail(message: string): string {
  return message.replace(RECOMMENDATION_TAIL, "").trim();
}

function extractAnchor(message: string): string | null {
  const cleaned = stripRecommendationTail(message);

  const anchorDining = cleaned.match(ANCHOR_DINING)?.[1]?.trim();
  if (anchorDining) {
    return anchorDining;
  }

  const metro = cleaned.match(METRO_CITY)?.[1]?.trim();
  if (metro) {
    return metro;
  }

  const nearby = cleaned.match(NEARBY_ANCHOR)?.[1]?.trim();
  if (nearby) {
    return nearby;
  }

  const city = cleaned.match(KOREAN_CITY)?.[1]?.trim();
  if (city) {
    return city;
  }

  const nav = resolveNavigationPlaceName(cleaned);
  if (nav && !isDiscoveryPhrase(nav) && nav.length <= 14) {
    return nav;
  }

  return null;
}

function buildNaverQuery(
  message: string,
  category: PlaceDiscoveryCategory
): string {
  const anchor = extractAnchor(message);
  const cuisine = extractCuisineKeyword(message);
  const activity = extractActivityKeyword(message);

  if (category === "activity") {
    const label = activityNaverSearchLabel(activity);
    return anchor ? `${anchor} ${label}` : label;
  }

  if (category === "cafe") {
    const label = "카페";
    return anchor ? `${anchor} ${label}` : label;
  }

  if (cuisine) {
    const label = cuisineNaverSearchLabel(cuisine);
    return anchor ? `${anchor} ${label}` : label;
  }

  const label = diningSearchLabel(message);
  return anchor ? `${anchor} ${label}` : label;
}

/** Naver local search label — "치킨" alone matches famous spots, not chicken shops. */
function cuisineNaverSearchLabel(cuisine: string): string {
  if (/^치킨$/iu.test(cuisine)) {
    return "치킨집";
  }
  if (/^피자$/iu.test(cuisine)) {
    return "피자집";
  }
  return cuisine;
}

export function parseFindCafeIntent(message: string): FindCafeEvent | null {
  const trimmed = message.trim();
  if (!isFindCafeQuery(trimmed)) {
    return null;
  }

  let vibe: PlaceVibe = "unknown";
  if (/조용|한적|quiet|study|스터디/i.test(trimmed)) {
    vibe = "quiet";
  } else if (/활기|시끌|lively|붐/i.test(trimmed)) {
    vibe = "lively";
  } else if (/작업|노트북|work/i.test(trimmed)) {
    vibe = "work";
  }

  return {
    intent: "FIND_CAFE",
    vibe,
    raw_message: trimmed,
  };
}

export function parseFindPlaceIntent(message: string): FindPlaceEvent | null {
  const trimmed = message.trim();
  if (!isPlaceRecommendationQuery(trimmed)) {
    return null;
  }

  const cuisineKeyword = extractCuisineKeyword(trimmed);
  const activity = extractActivityKeyword(trimmed);
  const wantsCafe = isFindCafeQuery(trimmed);
  const dining =
    !activity &&
    !wantsCafe &&
    (FIND_DINING.test(trimmed) ||
      RECOMMEND_THEN_DINING.test(trimmed) ||
      ANCHOR_DINING.test(trimmed) ||
      (/맛집|식당|레스토랑|치킨집|음식점/u.test(trimmed) &&
        /추천|찾|알려/u.test(trimmed)) ||
      (cuisineKeyword !== null &&
        !isCafeOnlyCuisine(cuisineKeyword) &&
        /추천|찾|알려|골라|해\s*줘/u.test(trimmed)));

  let category: PlaceDiscoveryCategory = "cafe";
  if (activity || isActivityDiscoveryQuery(trimmed)) {
    category = "activity";
  } else if (dining || (cuisineKeyword !== null && !isCafeOnlyCuisine(cuisineKeyword))) {
    category = "restaurant";
  } else if (wantsCafe) {
    category = "cafe";
  }

  const cafeEvent = category === "cafe" ? parseFindCafeIntent(trimmed) : null;

  return {
    intent: "FIND_PLACE",
    category,
    vibe: cafeEvent?.vibe ?? "unknown",
    cuisine: category === "restaurant" ? cuisineKeyword : null,
    activity: category === "activity" ? activity : null,
    naverQuery: buildNaverQuery(trimmed, category),
    anchor: extractAnchor(trimmed),
    raw_message: trimmed,
  };
}

export function buildCafeDiscoveryCriteria(event: FindCafeEvent): PlaceDiscoveryCriteria {
  return {
    intent: event.intent,
    query: event.vibe === "quiet" ? "quiet cafe" : "cafe",
    category: "cafe",
    cuisine_keyword: null,
    vibe: event.vibe,
    only_open_now: true,
    min_rating: 4.0,
    max_results: 3,
    radius_m: 1500,
  };
}

export function buildPlaceDiscoveryCriteria(event: FindPlaceEvent): PlaceDiscoveryCriteria {
  return {
    intent: event.intent,
    query: event.naverQuery,
    category: event.category,
    cuisine_keyword: event.cuisine ?? event.activity,
    vibe: event.vibe,
    only_open_now: false,
    min_rating: 0,
    max_results: 5,
    radius_m: 3000,
  };
}

export { isActivityDiscoveryQuery, extractActivityKeyword } from "@/lib/context-resolver/discovery/extract-activity-keyword";
