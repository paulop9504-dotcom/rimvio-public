import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";
import type { LocationSuggestion } from "@/lib/action-chat/confirmation-types";
import { buildLocationSuggestions } from "@/lib/corrections/location-suggestions";
import { placeCandidateToLocationSuggestion } from "@/lib/corrections/place-candidate-to-suggestion";
import { fetchNaverLocalPlaceCandidates } from "@/lib/naver/local-to-place-candidate";
import { isNaverSearchConfigured } from "@/lib/naver/config";

const REGION_IN_MESSAGE =
  /(?:둔산|타임월드|센터시티|강남|역삼|홍대|신촌|수서|판교|제주|해운대|부산|대전|서울)[가-힣]*(?:동|구|역)?/u;

function dedupeSuggestions(items: LocationSuggestion[]): LocationSuggestion[] {
  const seen = new Set<string>();
  const next: LocationSuggestion[] = [];

  for (const item of items) {
    const key = `${item.label}|${item.address}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(item);
  }

  return next;
}

export function buildLocationSearchQuery(input: {
  extracted: ConfirmationExtractedData;
  message: string;
}): string {
  const regionFromMessage = input.message.match(REGION_IN_MESSAGE)?.[0]?.trim();
  const regionFromAddress = input.extracted.address?.split(/\s+/).slice(0, 2).join(" ");
  const regionHint = regionFromMessage || regionFromAddress || "";
  const placeName = input.extracted.place_name?.trim() || "";

  if (regionHint && placeName) {
    return `${regionHint} ${placeName}`.trim();
  }

  if (placeName) {
    return placeName;
  }

  return input.message.trim().slice(0, 40);
}

function stationFallbackSuggestion(input: {
  extracted: ConfirmationExtractedData;
  message: string;
}): LocationSuggestion[] {
  const stationName = input.extracted.place_name?.match(/^([가-힣A-Za-z0-9]{2,12}역)$/u)?.[1];
  if (!stationName) {
    return [];
  }

  const regionFromMessage = input.message.match(REGION_IN_MESSAGE)?.[0]?.trim();
  const regionFromAddress = input.extracted.address?.split(/\s+/).slice(0, 2).join(" ");
  const regionHint = regionFromMessage || regionFromAddress || "";

  return [
    {
      id: `station-${stationName}`,
      label: stationName,
      place_name: stationName,
      address: regionHint,
    },
  ];
}

export async function resolveLocationSuggestionsForConfirm(input: {
  extracted: ConfirmationExtractedData;
  message: string;
  maxResults?: number;
  lifeZoneLabel?: string | null;
}): Promise<LocationSuggestion[]> {
  const maxResults = input.maxResults ?? 5;
  const brandHint = input.extracted.place_name;
  let query = buildLocationSearchQuery(input);

  if (
    input.lifeZoneLabel?.trim() &&
    !query.includes(input.lifeZoneLabel.trim()) &&
    !/(?:구|동|시|군|역)/u.test(query)
  ) {
    query = `${input.lifeZoneLabel.trim()} ${query}`.trim();
  }

  const fallback = buildLocationSuggestions({
    place_name: input.extracted.place_name,
    address: input.extracted.address,
    query,
  });

  if (!query.trim()) {
    return fallback.slice(0, maxResults);
  }

  const stationOnly = stationFallbackSuggestion(input);
  if (stationOnly.length > 0 && fallback.length === 0 && !isNaverSearchConfigured()) {
    return stationOnly;
  }

  if (!isNaverSearchConfigured()) {
    const merged = dedupeSuggestions([...fallback, ...stationOnly]);
    return merged.slice(0, maxResults);
  }

  try {
    const candidates = await fetchNaverLocalPlaceCandidates({
      query,
      display: maxResults,
    });

    const fromNaver = candidates.map((candidate) =>
      placeCandidateToLocationSuggestion(candidate, brandHint)
    );

    const merged = dedupeSuggestions([...fromNaver, ...fallback, ...stationOnly]);
    return merged.slice(0, maxResults);
  } catch {
    return dedupeSuggestions([...fallback, ...stationOnly]).slice(0, maxResults);
  }
}
