import {
  Client,
  Language,
} from "@googlemaps/google-maps-services-js";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { googlePlacesApiKey, isGooglePlacesConfigured } from "@/lib/locate/google-places-config";

const client = new Client({});

const NEARBY_RADIUS_M = 90;
const MAX_DISTANCE_M = 120;

export type NearbyEateryCandidate = {
  placeName: string;
  lat: number;
  lng: number;
  googlePlaceId: string | null;
  distanceM: number;
};

function distanceMeters(
  originLat: number,
  originLng: number,
  lat: number,
  lng: number,
): number {
  return haversineKm(originLat, originLng, lat, lng) * 1000;
}

const EATERY_TYPES = ["restaurant", "cafe", "meal_takeaway", "bakery"] as const;

/** Closest food POI near capture GPS — server-side (Google Places Nearby). */
export async function resolveNearbyEateryAtCoords(input: {
  lat: number;
  lng: number;
}): Promise<NearbyEateryCandidate | null> {
  if (!isGooglePlacesConfigured()) {
    return null;
  }

  const key = googlePlacesApiKey();
  if (!key) {
    return null;
  }

  let best: NearbyEateryCandidate | null = null;

  for (const type of EATERY_TYPES) {
    try {
      const response = await client.placesNearby({
        params: {
          location: { lat: input.lat, lng: input.lng },
          radius: NEARBY_RADIUS_M,
          type,
          language: Language.ko,
          key,
        },
      });

      for (const result of response.data.results ?? []) {
        const lat = result.geometry?.location?.lat;
        const lng = result.geometry?.location?.lng;
        const name = result.name?.trim();
        if (
          typeof lat !== "number" ||
          typeof lng !== "number" ||
          !name
        ) {
          continue;
        }

        const distanceM = distanceMeters(input.lat, input.lng, lat, lng);
        if (distanceM > MAX_DISTANCE_M) {
          continue;
        }

        const candidate: NearbyEateryCandidate = {
          placeName: name,
          lat,
          lng,
          googlePlaceId: result.place_id ?? null,
          distanceM,
        };

        if (!best || candidate.distanceM < best.distanceM) {
          best = candidate;
        }
      }
    } catch {
      // try next type
    }
  }

  return best;
}
