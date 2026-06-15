import type {
  LocationConfirmUxWire,
  LocationSuggestion,
} from "@/lib/action-chat/confirmation-types";
import { planLocationConfirmUx } from "@/lib/corrections/location-confirm-ux";
import { rankLocationSuggestions } from "@/lib/corrections/score-location-match";
import { placeCandidateToLocationSuggestion } from "@/lib/corrections/place-candidate-to-suggestion";
import { resolveLocationSuggestionsForConfirm } from "@/lib/corrections/resolve-location-suggestions";
import { findPlacesByName } from "@/lib/locate/google-places-find";
import { isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import {
  parseManualContextPlaceText,
  type ParsedManualContextPlace,
} from "@/lib/globe/parse-manual-context-place-text";
import {
  classifyOverseasManualPlace,
  overseasPlaceConfirmPrompt,
  type OverseasManualPlaceHint,
} from "@/lib/globe/classify-overseas-manual-place";
import {
  buildGoogleMapsSearchHref,
  buildKakaoMapSearchWebHref,
} from "@/lib/resolvers/deep-links";
import { resolvePlaceCoordinates as resolveFallbackCoords } from "@/lib/experience-graph/resolve-place-coordinates";
import { resolvePlaceCoordinates as resolveKakaoPlaceCoordinates } from "@/lib/traffic/resolve-place-coordinates";

export type ManualContextPlaceCandidateResult = {
  query: string;
  parsed: ParsedManualContextPlace;
  suggestions: LocationSuggestion[];
  ux: LocationConfirmUxWire;
  mapLinks: {
    kakao: string;
    google: string;
  };
  autoResolved: ManualContextResolvedPlace | null;
  overseas: OverseasManualPlaceHint | null;
  approximateFallback: ManualContextResolvedPlace | null;
};

function dedupeSuggestions(items: LocationSuggestion[]): LocationSuggestion[] {
  const seen = new Set<string>();
  const next: LocationSuggestion[] = [];

  for (const item of items) {
    const key =
      item.lat != null && item.lng != null
        ? `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`
        : `${item.label}|${item.address}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(item);
  }

  return next;
}

function googleToSuggestion(input: {
  place_name: string;
  formatted_address: string | null;
  lat: number;
  lng: number;
  google_place_id: string | null;
}): LocationSuggestion {
  const maps_url = input.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${input.google_place_id}`
    : buildGoogleMapsSearchHref(input.place_name);

  return {
    id: `google:${input.google_place_id ?? `${input.lat},${input.lng}`}`,
    label: input.place_name,
    place_name: input.place_name,
    address: input.formatted_address?.trim() || input.place_name,
    lat: input.lat,
    lng: input.lng,
    maps_url,
  };
}

async function kakaoSuggestion(query: string): Promise<LocationSuggestion | null> {
  const hit = await resolveKakaoPlaceCoordinates(query);
  if (!hit) {
    return null;
  }

  return {
    id: `kakao:${hit.lat},${hit.lng}`,
    label: hit.label,
    place_name: hit.label,
    address: hit.label,
    lat: hit.lat,
    lng: hit.lng,
    maps_url: buildKakaoMapSearchWebHref(query),
  };
}

function pickAutoResolved(input: {
  parsed: ParsedManualContextPlace;
  suggestions: LocationSuggestion[];
  ux: LocationConfirmUxWire;
  message: string;
}): ManualContextResolvedPlace | null {
  const withCoords = input.suggestions.filter(
    (row) => row.lat != null && row.lng != null,
  );
  if (withCoords.length === 0) {
    return null;
  }

  const ranked = rankLocationSuggestions(withCoords, {
    extracted: {
      address: null,
      phone: null,
      datetime: null,
      place_name: input.parsed.displayLabel,
      url: null,
    },
    message: input.message,
  });
  const top = ranked[0];
  if (!top || top.score < 38) {
    return null;
  }

  const recommended =
    input.suggestions.find((row) => row.id === input.ux.recommended_id) ??
    top.suggestion;

  const canAuto =
    input.ux.mode === "quick_pick" ||
    withCoords.length === 1 ||
    top.score >= 72;

  if (!canAuto) {
    return null;
  }

  const resolved = suggestionToResolvedPlace(recommended);
  if (!resolved) {
    return null;
  }

  return {
    ...resolved,
    label: input.parsed.displayLabel || resolved.label,
    placeName: input.parsed.displayLabel || resolved.placeName,
    confirmed: true,
  };
}

function buildApproximateFallback(
  overseas: OverseasManualPlaceHint,
): ManualContextResolvedPlace {
  return {
    label: overseas.label,
    placeName: overseas.label,
    lat: overseas.lat,
    lng: overseas.lng,
    confirmed: true,
  };
}

/** Naver + Google + Kakao — parse NL place + auto-pin when confident. */
export async function resolveManualContextPlaceCandidates(input: {
  place: string;
  title?: string | null;
  userLat?: number | null;
  userLng?: number | null;
  maxResults?: number;
}): Promise<ManualContextPlaceCandidateResult> {
  const parsed = parseManualContextPlaceText(input.place);
  const overseas = classifyOverseasManualPlace(input.place);
  const query =
    overseas?.geocodeQuery ??
    (parsed.searchQuery.trim() || input.place.trim());
  const message = [input.title?.trim(), input.place.trim(), query]
    .filter(Boolean)
    .join(" ");
  const maxResults = input.maxResults ?? 5;

  const [naverRows, googleRows, kakaoRow] = await Promise.all([
    overseas
      ? Promise.resolve([])
      : resolveLocationSuggestionsForConfirm({
          extracted: {
            address: null,
            phone: null,
            datetime: null,
            place_name: parsed.displayLabel || query,
            url: null,
          },
          message,
          maxResults,
        }),
    isGooglePlacesConfigured()
      ? findPlacesByName({
          placeName: query,
          userLat: overseas ? null : input.userLat,
          userLng: overseas ? null : input.userLng,
          maxResults,
        })
      : Promise.resolve([]),
    overseas ? Promise.resolve(null) : kakaoSuggestion(parsed.searchQuery.trim() || input.place.trim()),
  ]);

  const merged = dedupeSuggestions([
    ...naverRows,
    ...googleRows.map((row) => googleToSuggestion(row)),
    ...(kakaoRow ? [kakaoRow] : []),
  ]).slice(0, maxResults);

  let ux = planLocationConfirmUx({
    suggestions: merged,
    extracted: {
      address: null,
      phone: null,
      datetime: null,
      place_name: overseas?.label ?? parsed.displayLabel ?? query,
      url: null,
    },
    message,
  });

  const suggestions = ux.suggestions.length > 0 ? ux.suggestions : merged;
  let autoResolved = overseas
    ? null
    : pickAutoResolved({
        parsed,
        suggestions,
        ux,
        message,
      });

  if (overseas) {
    ux = {
      ...ux,
      mode: suggestions.length > 0 ? "inline_pick" : "classic",
      prompt: overseasPlaceConfirmPrompt(overseas),
      recommended_id: undefined,
    };
  }

  if (!autoResolved && !overseas && suggestions.length === 0 && parsed.displayLabel) {
    const fallback = resolveFallbackCoords(parsed.searchQuery);
    if (fallback.label !== "한국" || parsed.displayLabel.includes("동")) {
      autoResolved = {
        label: parsed.displayLabel,
        placeName: parsed.displayLabel,
        lat: fallback.lat,
        lng: fallback.lng,
        confirmed: true,
      };
    }
  }

  const approximateFallback = overseas ? buildApproximateFallback(overseas) : null;

  return {
    query,
    parsed,
    suggestions,
    ux,
    autoResolved,
    overseas,
    approximateFallback,
    mapLinks: {
      kakao: buildKakaoMapSearchWebHref(query),
      google: buildGoogleMapsSearchHref(query),
    },
  };
}

export type ManualContextResolvedPlace = {
  label: string;
  placeName: string;
  lat: number;
  lng: number;
  confirmed: boolean;
  mapsUrl?: string | null;
};

export function suggestionToResolvedPlace(
  suggestion: LocationSuggestion,
): ManualContextResolvedPlace | null {
  if (suggestion.lat == null || suggestion.lng == null) {
    return null;
  }
  return {
    label: suggestion.label.trim() || suggestion.place_name,
    placeName: suggestion.place_name.trim() || suggestion.label.trim(),
    lat: suggestion.lat,
    lng: suggestion.lng,
    confirmed: true,
    mapsUrl: suggestion.maps_url ?? null,
  };
}
