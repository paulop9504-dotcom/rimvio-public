import {
  Client,
  Language,
} from "@googlemaps/google-maps-services-js";
import { googlePlacesApiKey, isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import { isNaverSearchConfigured } from "@/lib/naver/config";
import { fetchNaverLocalPlaceCandidates } from "@/lib/naver/local-to-place-candidate";
import type { PlaceCandidate, PlaceDiscoveryCriteria } from "@/lib/context-resolver/places/types";

const client = new Client({});

function mockCandidates(input: {
  lat: number;
  lng: number;
  criteria: PlaceDiscoveryCriteria;
}): PlaceCandidate[] {
  const quiet = input.criteria.vibe === "quiet";
  const base: PlaceCandidate[] = [
    {
      place_id: "mock-cafe-a",
      name: quiet ? "카페 무드 (조용함)" : "카페 무드",
      address: "현재 위치 도보 5분",
      lat: input.lat + 0.0012,
      lng: input.lng + 0.0008,
      rating: 4.6,
      open_now: true,
      vibes: ["quiet", "work"],
      phone: "050-1111-2222",
      maps_url: null,
    },
    {
      place_id: "mock-cafe-b",
      name: "브루잉 라운지",
      address: "현재 위치 도보 8분",
      lat: input.lat + 0.002,
      lng: input.lng - 0.001,
      rating: 4.3,
      open_now: true,
      vibes: quiet ? ["work"] : ["lively"],
      phone: null,
      maps_url: null,
    },
    {
      place_id: "mock-cafe-c",
      name: "테라스 커피",
      address: "현재 위치 도보 12분",
      lat: input.lat - 0.0015,
      lng: input.lng + 0.0015,
      rating: 4.1,
      open_now: true,
      vibes: ["quiet"],
      phone: "050-3333-4444",
      maps_url: null,
    },
    {
      place_id: "mock-cafe-d",
      name: "스터디 카페 247",
      address: "현재 위치 도보 15분",
      lat: input.lat + 0.003,
      lng: input.lng + 0.002,
      rating: 3.8,
      open_now: false,
      vibes: ["quiet", "work"],
      phone: null,
      maps_url: null,
    },
  ];

  return base;
}

export async function queryNearbyPlaces(input: {
  lat: number;
  lng: number;
  criteria: PlaceDiscoveryCriteria;
}): Promise<PlaceCandidate[]> {
  let candidates: PlaceCandidate[] = [];

  if (isGooglePlacesConfigured()) {
    candidates = await queryGooglePlaces(input);
  }

  if (candidates.length === 0 && isNaverSearchConfigured()) {
    candidates = await queryNaverLocalPlaces(input);
  }

  if (candidates.length === 0) {
    candidates = mockCandidates(input);
  }

  return filterPlaceCandidates(candidates, input.criteria);
}

async function queryNaverLocalPlaces(input: {
  lat: number;
  lng: number;
  criteria: PlaceDiscoveryCriteria;
}): Promise<PlaceCandidate[]> {
  const categoryLabel = input.criteria.category === "cafe" ? "카페" : "장소";
  const query = [input.criteria.query.trim(), categoryLabel].filter(Boolean).join(" ");

  try {
    return await fetchNaverLocalPlaceCandidates({
      query,
      display: Math.min(input.criteria.max_results, 5),
    });
  } catch {
    return [];
  }
}

async function queryGooglePlaces(input: {
  lat: number;
  lng: number;
  criteria: PlaceDiscoveryCriteria;
}): Promise<PlaceCandidate[]> {
  const key = googlePlacesApiKey();
  if (!key) {
    return [];
  }

  try {
    const response = await client.placesNearby({
      params: {
        location: { lat: input.lat, lng: input.lng },
        radius: input.criteria.radius_m,
        type: input.criteria.category === "cafe" ? "cafe" : "point_of_interest",
        opennow: input.criteria.only_open_now,
        keyword: input.criteria.query,
        language: Language.ko,
        key,
      },
    });

    return (response.data.results ?? [])
      .map((result) => {
        const lat = result.geometry?.location?.lat;
        const lng = result.geometry?.location?.lng;
        if (typeof lat !== "number" || typeof lng !== "number") {
          return null;
        }

        return {
          place_id: result.place_id ?? `place-${result.name}`,
          name: result.name ?? "장소",
          address: result.vicinity ?? null,
          lat,
          lng,
          rating: result.rating ?? 0,
          open_now: result.opening_hours?.open_now ?? true,
          vibes: inferVibesFromName(result.name ?? ""),
          phone: null,
          maps_url: result.place_id
            ? `https://www.google.com/maps/place/?q=place_id:${result.place_id}`
            : null,
        } satisfies PlaceCandidate;
      })
      .filter((item): item is PlaceCandidate => item !== null);
  } catch {
    return [];
  }
}

function inferVibesFromName(name: string): PlaceCandidate["vibes"] {
  const vibes: PlaceCandidate["vibes"] = [];
  if (/조용|study|스터디|무드|book/i.test(name)) {
    vibes.push("quiet", "work");
  }
  if (/라운지|lounge|바|bar/i.test(name)) {
    vibes.push("lively");
  }
  if (vibes.length === 0) {
    vibes.push("unknown");
  }
  return vibes;
}

export function filterPlaceCandidates(
  candidates: PlaceCandidate[],
  criteria: PlaceDiscoveryCriteria
): PlaceCandidate[] {
  return candidates
    .filter((place) => place.rating >= criteria.min_rating)
    .filter((place) => (criteria.only_open_now ? place.open_now : true))
    .filter((place) => {
      if (criteria.vibe === "unknown") {
        return true;
      }
      return place.vibes.includes(criteria.vibe) || place.vibes.includes("unknown");
    })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, criteria.max_results);
}
