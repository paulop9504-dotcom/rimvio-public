import type { LocationSuggestion } from "@/lib/action-chat/confirmation-types";
import { haversineKm } from "@/lib/geo/haversine-km";
import { fetchNaverLocalPlaceCandidates } from "@/lib/naver/local-to-place-candidate";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import type { PlaceCandidate } from "@/lib/context-resolver/places/types";

const SI_TOKEN = /([가-힣]{2,8}(?:특별시|광역시|특별자치시|특별자치도|도))/u;
const GU_TOKEN = /([가-힣]{2,8}구)/u;
const DONG_TOKEN = /([가-힣A-Za-z0-9]{2,12}동)/u;

function normalizeSi(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value
    .replace(/특별시|광역시|특별자치시|특별자치도/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRegionFromAddress(address: string, areaToken: string): {
  searchQuery: string;
  label: string;
} | null {
  const hay = address.replace(/\s+/g, " ").trim();
  if (!hay.includes(areaToken.replace(/동$/u, "")) && !hay.includes(areaToken)) {
    return null;
  }

  const si = normalizeSi(hay.match(SI_TOKEN)?.[1] ?? null);
  const gu = hay.match(GU_TOKEN)?.[1] ?? null;
  const dong = hay.match(DONG_TOKEN)?.[1] ?? areaToken;

  const parts = [si, gu, dong].filter(Boolean) as string[];
  if (parts.length < 2) {
    return null;
  }

  const searchQuery = parts.join(" ");
  const label = gu ? `${gu} ${dong}` : searchQuery;

  return { searchQuery, label };
}

function candidateToAreaSuggestion(
  candidate: PlaceCandidate,
  parsed: { searchQuery: string; label: string },
  distanceKm?: number,
): LocationSuggestion {
  const maps_url =
    candidate.maps_url?.trim() ||
    (candidate.lat && candidate.lng
      ? `https://map.naver.com/v5/search/${encodeURIComponent(parsed.searchQuery)}`
      : undefined);

  return {
    id: `area-${parsed.searchQuery.replace(/\s+/g, "-")}`,
    label: parsed.label,
    place_name: parsed.searchQuery,
    address: candidate.address?.trim() || parsed.searchQuery,
    lat: candidate.lat,
    lng: candidate.lng,
    maps_url,
    distance_km: distanceKm,
  };
}

function dedupeSuggestions(items: LocationSuggestion[]): LocationSuggestion[] {
  const seen = new Set<string>();
  const next: LocationSuggestion[] = [];

  for (const item of items) {
    const key = item.place_name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(item);
  }

  return next;
}

function sortByDistance(
  items: LocationSuggestion[],
  origin: { lat: number; lng: number } | null,
): LocationSuggestion[] {
  if (!origin) {
    return items;
  }

  return [...items].sort((a, b) => {
    const da =
      a.lat != null && a.lng != null
        ? haversineKm(origin, { lat: a.lat, lng: a.lng })
        : Number.POSITIVE_INFINITY;
    const db =
      b.lat != null && b.lng != null
        ? haversineKm(origin, { lat: b.lat, lng: b.lng })
        : Number.POSITIVE_INFINITY;
    return da - db;
  });
}

export async function resolveAreaGeocodeCandidates(input: {
  areaToken: string;
  maxResults?: number;
  origin?: { lat: number; lng: number } | null;
  radiusKm?: number;
}): Promise<LocationSuggestion[]> {
  const areaToken = input.areaToken.trim();
  const maxResults = input.maxResults ?? 6;
  const origin = input.origin ?? null;
  const radiusKm = input.radiusKm ?? 80;

  if (!areaToken) {
    return [];
  }

  if (!isNaverSearchConfigured()) {
    return [];
  }

  try {
    const candidates = await fetchNaverLocalPlaceCandidates({
      query: areaToken,
      display: 15,
    });

    const suggestions: LocationSuggestion[] = [];

    for (const candidate of candidates) {
      const address = candidate.address?.trim();
      if (!address) {
        continue;
      }

      const parsed = parseRegionFromAddress(address, areaToken);
      if (!parsed) {
        continue;
      }

      let distanceKm: number | undefined;
      if (origin && candidate.lat && candidate.lng) {
        distanceKm = haversineKm(origin, { lat: candidate.lat, lng: candidate.lng });
        if (distanceKm > radiusKm) {
          continue;
        }
      }

      suggestions.push(candidateToAreaSuggestion(candidate, parsed, distanceKm));
    }

    const merged = sortByDistance(dedupeSuggestions(suggestions), origin);
    return merged.slice(0, maxResults);
  } catch {
    return [];
  }
}
