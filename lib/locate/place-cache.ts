import { normalizePlaceNameKey } from "@/lib/locate/normalize-place-name";
import type { LocatePlaceResult } from "@/lib/locate/types";
import { tryCreateClient } from "@/lib/supabase/server";

type CachedPlaceRow = {
  place_name: string;
  formatted_address: string | null;
  lat: number;
  lng: number;
  google_place_id: string | null;
};

const memoryCache = new Map<string, CachedPlaceRow>();

export async function readCachedPlace(
  placeName: string
): Promise<LocatePlaceResult | null> {
  const key = normalizePlaceNameKey(placeName);
  const memory = memoryCache.get(key);
  if (memory) {
    return { ...memory, cached: true };
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("place_locate_cache")
    .select("place_name, formatted_address, lat, lng, google_place_id")
    .eq("place_name_key", key)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as CachedPlaceRow;
  memoryCache.set(key, row);

  return {
    place_name: row.place_name,
    formatted_address: row.formatted_address,
    lat: row.lat,
    lng: row.lng,
    google_place_id: row.google_place_id,
    cached: true,
  };
}

export async function writeCachedPlace(place: LocatePlaceResult) {
  const key = normalizePlaceNameKey(place.place_name);
  const row: CachedPlaceRow = {
    place_name: place.place_name,
    formatted_address: place.formatted_address,
    lat: place.lat,
    lng: place.lng,
    google_place_id: place.google_place_id,
  };

  memoryCache.set(key, row);

  const supabase = await tryCreateClient();
  if (!supabase) {
    return;
  }

  await supabase.from("place_locate_cache").upsert(
    {
      place_name_key: key,
      place_name: row.place_name,
      formatted_address: row.formatted_address,
      lat: row.lat,
      lng: row.lng,
      google_place_id: row.google_place_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "place_name_key" }
  );
}
