/**
 * Server — external traces as projection index records (bbox).
 */

import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";
import { externalTraceToProjectionRecord } from "@/lib/globe/pin-projection-index-record";
import type { PinProjectionBbox } from "@/lib/globe/pin-projection-index-types";
import type { PinProjectionIndexRecord } from "@/lib/globe/pin-projection-index-types";
import {
  EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M,
  filterExternalTracesNear,
} from "@/lib/globe/server-external-globe-traces";
import { createClient } from "@/lib/supabase/server";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";

export async function fetchExternalGlobePinsIndexInBbox(input: {
  bbox: PinProjectionBbox;
  excludeUserId?: string | null;
  limit?: number;
}): Promise<PinProjectionIndexRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personal_globe_pins")
    .select("id,user_id,event_id,pin,visibility,lat,lng,updated_at")
    .eq("visibility", "external")
    .gte("lat", input.bbox.minLat)
    .lte("lat", input.bbox.maxLat)
    .gte("lng", input.bbox.minLng)
    .lte("lng", input.bbox.maxLng)
    .limit(input.limit ?? 120);

  if (error) {
    throw new Error(error.message);
  }

  const centerLat = (input.bbox.minLat + input.bbox.maxLat) / 2;
  const centerLng = (input.bbox.minLng + input.bbox.maxLng) / 2;
  const latSpan = input.bbox.maxLat - input.bbox.minLat;
  const radiusM = Math.max(
    EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M,
    latSpan * 111_000,
  );

  const traces = filterExternalTracesNear({
    rows: (data ?? []).map((row) => ({
      ...row,
      pin: row.pin as PersonalGlobePin | null,
    })),
    lat: centerLat,
    lng: centerLng,
    radiusM,
    excludeUserId: input.excludeUserId,
  });

  return traces.map((trace: ExternalGlobeTrace) => {
    const record = externalTraceToProjectionRecord(trace);
    return {
      ...record,
      authorUserId: trace.authorUserId,
      authorDisplayName: trace.authorDisplayName,
    };
  });
}
