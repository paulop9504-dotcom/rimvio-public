import { stripUiNoise } from "@/lib/action-chat/clean-entity-text";
import { isAiIntentUtterance } from "@/lib/action-chat/classify-ai-intent-utterance";
import { isNonLocationActionCommand } from "@/lib/action-chat/is-non-location-action";
import { isPlaceRecommendationQuery } from "@/lib/context-resolver/discovery/parse-find-place-intent";
import { isVitalityStateUtterance } from "@/lib/vitality-state/classify-vitality-state-intent";

const STATION_RE = /([가-힣A-Za-z0-9]{2,12}역)/;
const AIRPORT_RE = /([가-힣A-Za-z0-9]{2,12}공항)/;
const TERMINAL_RE = /([가-힣A-Za-z0-9]{2,8}터미널)/;

const RELATIVE_TIME_PREFIX =
  /^(?:\d{1,3}\s*분\s*(?:뒤|후|뒤에|후에)\s*|\d{1,2}\s*시간\s*(?:뒤|후|뒤에|후에)\s*)/;

const DAY_PREFIX = /^(?:오늘|내일|모레)\s*(?:오전|오후)?\s*(?:\d{1,2}\s*시\s*)?/;

const TRAVEL_SUFFIX =
  /\s*(?:가야(?:됨|해|할|돼|요)?|갈\s*거(?:야|예요)?|가\s*야|출발(?:해|할)?|이동|행|만나(?:요|자)?|볼\s*거)(?:[!?.~ㅋㅎ\s]*)$/i;

const BRAND_PLACE =
  /(?:갤러리아|스타벅스|맥도날드|쿠우쿠우|이마트|홈플러스|코스트코|올리브영|cgv|메가박스)/i;

const PLACE_SEARCH_COMMAND =
  /(?:맛집|식당|레스토랑|음식점|카페).*(?:검색|찾기|찾아)|(?:검색|찾기|찾아).*(?:맛집|식당|레스토랑)|^맛집\s*(?:검색|찾기)/iu;

const DISTRICT_HINT =
  /(?:둔산|역삼|강남|타임월드|센터시티|도안|월드컵)(?!동|로|역|구|시)/i;

const TRAVEL_NOISE = /(?:분\s*(?:뒤|후)|가야|갈\s*거|출발|이동|만나|볼\s*거)/;

const CONVERSATIONAL_NOT_PLACE =
  /(?:사도\s*돼|해도\s*돼|괜찮(?:아|을)|어때|어떡(?:해|하지)|뭐(?:야|지|할)|[?？])/iu;

export function looksLikeNoisyPlaceLabel(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }
  const trimmed = value.trim();
  return (
    TRAVEL_NOISE.test(trimmed) ||
    /(?:가야|갈\s*거|출발)/.test(trimmed) ||
    trimmed.length > 24
  );
}

function pickTransitLabel(message: string): string | null {
  return (
    message.match(STATION_RE)?.[1] ??
    message.match(AIRPORT_RE)?.[1] ??
    message.match(TERMINAL_RE)?.[1] ??
    null
  );
}

/**
 * Navigation destination only — strips time/travel verbs from user sentences.
 * "3분뒤 수서역 가야됨" → "수서역"
 */
export function resolveNavigationPlaceName(message: string): string | null {
  const trimmed = stripUiNoise(message.trim());
  if (!trimmed) {
    return null;
  }

  if (isVitalityStateUtterance(trimmed)) {
    return null;
  }

  if (isNonLocationActionCommand(trimmed)) {
    return null;
  }

  if (isAiIntentUtterance(trimmed) || CONVERSATIONAL_NOT_PLACE.test(trimmed)) {
    return null;
  }

  if (isPlaceRecommendationQuery(trimmed)) {
    return null;
  }

  if (PLACE_SEARCH_COMMAND.test(trimmed)) {
    return null;
  }

  const transit = pickTransitLabel(trimmed);
  if (transit) {
    return transit;
  }

  const brand = trimmed.match(BRAND_PLACE);
  if (brand?.[0]) {
    return brand[0];
  }

  const district = trimmed.match(DISTRICT_HINT);
  if (district?.[0]) {
    return district[0];
  }

  let core = trimmed
    .replace(RELATIVE_TIME_PREFIX, "")
    .replace(DAY_PREFIX, "")
    .replace(TRAVEL_SUFFIX, "")
    .trim();

  const coreTransit = pickTransitLabel(core);
  if (coreTransit) {
    return coreTransit;
  }

  const coreBrand = core.match(BRAND_PLACE);
  if (coreBrand?.[0]) {
    return coreBrand[0];
  }

  const coreDistrict = core.match(DISTRICT_HINT);
  if (coreDistrict?.[0]) {
    return coreDistrict[0];
  }

  if (
    core.length >= 2 &&
    core.length <= 16 &&
    !CONVERSATIONAL_NOT_PLACE.test(core) &&
    !TRAVEL_NOISE.test(core) &&
    !PLACE_SEARCH_COMMAND.test(core)
  ) {
    return core;
  }

  return null;
}

export function sanitizePlaceNameForNavigation(
  placeName: string | null | undefined,
  sourceMessage?: string | null
): string | null {
  const trimmed = placeName?.trim();
  if (!trimmed) {
    return sourceMessage ? resolveNavigationPlaceName(sourceMessage) : null;
  }

  if (trimmed.length <= 16 && !TRAVEL_NOISE.test(trimmed)) {
    const transit = pickTransitLabel(trimmed);
    if (transit) {
      return transit;
    }
    if (!/가야|갈\s*거/.test(trimmed)) {
      return trimmed;
    }
  }

  return (
    resolveNavigationPlaceName(sourceMessage ?? trimmed) ??
    pickTransitLabel(trimmed)
  );
}

/** Canonical place label for any user sentence or wire field. */
export function resolvePlaceLabelFromText(message: string): string | null {
  return resolveNavigationPlaceName(message);
}

export function normalizeExtractedPlaceData<
  T extends { place_name?: string | null; address?: string | null },
>(extracted: T, sourceMessage?: string | null): T {
  const sanitized = sanitizePlaceNameForNavigation(
    extracted.place_name,
    sourceMessage ?? extracted.place_name
  );

  if (sanitized === extracted.place_name) {
    return extracted;
  }

  return { ...extracted, place_name: sanitized };
}
