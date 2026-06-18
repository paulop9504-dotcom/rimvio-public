/**
 * Server — personal globe pins index slice (Supabase geo columns).
 */

import type { PinProjectionBbox } from "@/lib/globe/pin-projection-index-types";
import { personalGlobePinRowToProjectionRecord } from "@/lib/globe/pin-projection-index-record";
import type { PinProjectionIndexRecord } from "@/lib/globe/pin-projection-index-types";
import { createClient } from "@/lib/supabase/server";

type PersonalGlobePinRow = {
  event_id: string;
  pin: Record<string, unknown> | null;
  visibility: string | null;
  lat: number | null;
  lng: number | null;
};

export async function fetchPersonalGlobePinsIndexForUser(input: {
  userId: string;
  bbox?: PinProjectionBbox | null;
  limit?: number;
}): Promise<PinProjectionIndexRecord[]> {
  const supabase = await createClient();
  let query = supabase
    .from("personal_globe_pins")
    .select("event_id,pin,visibility,lat,lng,updated_at")
    .eq("user_id", input.userId)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("updated_at", { ascending: false });

  if (input.bbox) {
    query = query
      .gte("lat", input.bbox.minLat)
      .lte("lat", input.bbox.maxLat)
      .gte("lng", input.bbox.minLng)
      .lte("lng", input.bbox.maxLng);
  }

  const limit = input.limit ?? 500;
  const { data, error } = await query.limit(limit);
  if (error) {
    throw new Error(error.message);
  }

  const records: PinProjectionIndexRecord[] = [];
  for (const row of (data ?? []) as PersonalGlobePinRow[]) {
    const pin = row.pin;
    if (!pin || typeof pin !== "object") {
      continue;
    }
    const record = personalGlobePinRowToProjectionRecord({
      eventId: row.event_id,
      pin: pin as PersonalGlobePinRow["pin"] & {
        pinId?: string;
        lat?: number;
        lng?: number;
      },
      visibility: row.visibility,
      domainId: "experience",
    });
    if (record) {
      records.push(record);
    }
  }
  return records;
}
