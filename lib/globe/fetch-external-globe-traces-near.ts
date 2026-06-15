"use client";

import type { ExternalGlobeTrace } from "@/lib/globe/external-globe-trace-types";
import { EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M } from "@/lib/globe/server-external-globe-traces";

export async function fetchExternalGlobeTracesNear(input: {
  lat: number;
  lng: number;
  radiusM?: number;
  signal?: AbortSignal;
}): Promise<ExternalGlobeTrace[]> {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return [];
  }

  const params = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    radiusM: String(input.radiusM ?? EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M),
  });

  const response = await fetch(`/api/globe/external-traces?${params.toString()}`, {
    method: "GET",
    signal: input.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as { traces?: ExternalGlobeTrace[] };
  return Array.isArray(body.traces) ? body.traces : [];
}
