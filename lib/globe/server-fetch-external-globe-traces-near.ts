import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";
import { bboxForGlobeTraceQuery } from "@/lib/globe/globe-trace-cell";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import {
  EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M,
  filterExternalTracesNear,
} from "@/lib/globe/server-external-globe-traces";
import { createClient } from "@/lib/supabase/server";

/** Server — bbox-scoped external traces (no global harvest). */
export async function fetchExternalGlobeTracesNearServer(input: {
  lat: number;
  lng: number;
  radiusM?: number;
  excludeUserId?: string | null;
  limit?: number;
}): Promise<ExternalGlobeTrace[]> {
  const radiusM = input.radiusM ?? EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M;
  const bbox = bboxForGlobeTraceQuery({ lat: input.lat, lng: input.lng, radiusM });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personal_globe_pins")
    .select("id,user_id,event_id,pin,visibility,lat,lng,updated_at")
    .eq("visibility", "external")
    .gte("lat", bbox.minLat)
    .lte("lat", bbox.maxLat)
    .gte("lng", bbox.minLng)
    .lte("lng", bbox.maxLng)
    .limit(input.limit ?? 120);

  if (error) {
    throw new Error(error.message);
  }

  return filterExternalTracesNear({
    rows: (data ?? []).map((row) => ({
      ...row,
      pin: row.pin as PersonalGlobePin | null,
    })),
    lat: input.lat,
    lng: input.lng,
    radiusM,
    excludeUserId: input.excludeUserId,
  });
}
