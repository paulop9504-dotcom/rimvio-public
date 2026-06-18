import {
  Client,
  Language,
} from "@googlemaps/google-maps-services-js";
import { googlePlacesApiKey, isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

const client = new Client({});

const LODGING_SEARCH_RADIUS_M = 8_000;
const DEFAULT_MAX_RESULTS = 5;

function priceKrwFromGoogleLevel(level: number | undefined): number | null {
  if (level == null || !Number.isFinite(level)) {
    return null;
  }
  const table: Record<number, number> = {
    0: 0,
    1: 55_000,
    2: 85_000,
    3: 130_000,
    4: 190_000,
  };
  return table[level] ?? null;
}

function buildPlacePhotoUrl(photoReference: string, key: string): string {
  const params = new URLSearchParams({
    maxwidth: "640",
    photo_reference: photoReference,
    key,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

async function readLodgingPhotoUrl(
  placeId: string,
  key: string,
): Promise<string | null> {
  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: ["photo"],
        language: Language.ko,
        key,
      },
    });
    const photoRef = response.data.result?.photos?.[0]?.photo_reference;
    if (!photoRef) {
      return null;
    }
    return buildPlacePhotoUrl(photoRef, key);
  } catch {
    return null;
  }
}

export type FetchPlacesLodgingNearbyInput = {
  lat: number;
  lng: number;
  maxResults?: number;
};

/** Google Places Nearby (lodging) — server-side only. */
export async function fetchPlacesLodgingNearby(
  input: FetchPlacesLodgingNearbyInput,
): Promise<ContextLodgingInventoryRow[]> {
  if (!isGooglePlacesConfigured()) {
    return [];
  }

  const key = googlePlacesApiKey();
  if (!key) {
    return [];
  }

  const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;

  try {
    const response = await client.placesNearby({
      params: {
        location: { lat: input.lat, lng: input.lng },
        radius: LODGING_SEARCH_RADIUS_M,
        type: "lodging",
        language: Language.ko,
        key,
      },
    });

    const candidates = (response.data.results ?? [])
      .map((result) => {
        const lat = result.geometry?.location?.lat;
        const lng = result.geometry?.location?.lng;
        const placeId = result.place_id?.trim();
        const name = result.name?.trim();
        if (
          lat == null ||
          lng == null ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          !placeId ||
          !name
        ) {
          return null;
        }
        return {
          placeId,
          name,
          lat,
          lng,
          priceKrw: priceKrwFromGoogleLevel(result.price_level),
          partnerLabel: "google_places",
          images: [] as string[],
          videoUrl: null,
        } satisfies ContextLodgingInventoryRow;
      })
      .filter((row): row is ContextLodgingInventoryRow => row != null)
      .slice(0, maxResults);

    if (candidates.length === 0) {
      return [];
    }

    const withPhotos = await Promise.all(
      candidates.map(async (row) => {
        const photoUrl = await readLodgingPhotoUrl(row.placeId, key);
        return {
          ...row,
          images: photoUrl ? [photoUrl] : [],
        };
      }),
    );

    return withPhotos;
  } catch {
    return [];
  }
}
