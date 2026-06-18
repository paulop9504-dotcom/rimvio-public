"use client";

import type { NearbyEateryCandidate } from "@/lib/globe/resolve-nearby-eatery-at-coords";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";

const FETCH_TIMEOUT_MS = 8_000;

export async function fetchNearbyEateryAtCoords(input: {
  lat: number;
  lng: number;
}): Promise<NearbyEateryCandidate | null> {
  const params = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
  });

  const response = await fetchWithTimeout(`/api/globe/nearby-eatery?${params}`, {
    timeoutMs: FETCH_TIMEOUT_MS,
    timeoutLabel: "nearby-eatery",
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as {
    candidate?: NearbyEateryCandidate | null;
  };
  return body.candidate ?? null;
}
