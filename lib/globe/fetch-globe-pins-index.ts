"use client";

import type {
  GlobePinsIndexResponse,
  PinProjectionBbox,
} from "@/lib/globe/pin-projection-index-types";
import type { ParsedGlobePinsQuery } from "@/lib/globe/query-pin-projection-index";

export async function fetchGlobePinsIndex(input: {
  query?: ParsedGlobePinsQuery;
  bbox?: PinProjectionBbox | null;
  includeExternal?: boolean;
  signal?: AbortSignal;
}): Promise<GlobePinsIndexResponse> {
  const params = new URLSearchParams();
  if (input.bbox) {
    params.set(
      "bbox",
      [
        input.bbox.minLat,
        input.bbox.minLng,
        input.bbox.maxLat,
        input.bbox.maxLng,
      ].join(","),
    );
  } else if (input.query?.mode === "near") {
    params.set("lat", String(input.query.lat));
    params.set("lng", String(input.query.lng));
    params.set("radiusM", String(input.query.radiusM));
  }

  if (input.includeExternal) {
    params.set("includeExternal", "1");
  }

  const response = await fetch(`/api/globe/pins?${params.toString()}`, {
    signal: input.signal,
  });
  if (!response.ok) {
    throw new Error("globe_pins_index_fetch_failed");
  }
  return (await response.json()) as GlobePinsIndexResponse;
}
