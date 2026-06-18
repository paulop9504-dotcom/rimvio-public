import type { EventCandidate } from "@/lib/events/event-candidate";
import { fetchPlacesLodgingNearby } from "@/lib/globe/context-hub/fetch-places-lodging-nearby";
import { resolveLodgingMockForPlace } from "@/lib/globe/context-hub/lodging-mock-inventory";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { resolveContextLodgingSearchCoords } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import { resolveContextPlaceLabel } from "@/lib/globe/context-hub/resolve-context-place-label";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type LodgingInventorySource = "google_places" | "mock";

export type LoadedLodgingInventory = {
  rows: ContextLodgingInventoryRow[];
  source: LodgingInventorySource;
};

function withStayWindow(
  event: EventCandidate,
  rows: readonly ContextLodgingInventoryRow[],
): ContextLodgingInventoryRow[] {
  const plan = readPlanContextFromEvent(event);
  const checkInIso = plan?.windowStartIso ?? event.datetime ?? null;
  const checkOutIso = plan?.windowEndIso ?? null;
  return rows.map((row) => ({
    ...row,
    checkInIso: row.checkInIso ?? checkInIso,
    checkOutIso: row.checkOutIso ?? checkOutIso,
  }));
}

async function fetchLodgingInventoryFromApi(input: {
  lat: number;
  lng: number;
  maxResults?: number;
}): Promise<ContextLodgingInventoryRow[]> {
  const params = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
    max: String(input.maxResults ?? 5),
  });
  const response = await fetch(`/api/globe/lodging-inventory?${params.toString()}`);
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as {
    inventory?: ContextLodgingInventoryRow[];
  };
  return Array.isArray(body.inventory) ? body.inventory : [];
}

/** Hub factory load — Places API when configured, mock fallback for dev/tests. */
export async function loadLodgingInventoryRows(input: {
  event: EventCandidate;
  lat?: number | null;
  lng?: number | null;
  maxResults?: number;
  preferUserLocation?: boolean;
}): Promise<LoadedLodgingInventory> {
  const coords = resolveContextLodgingSearchCoords(input.event, input);
  let rows: ContextLodgingInventoryRow[] = [];

  if (coords) {
    if (typeof window !== "undefined") {
      rows = await fetchLodgingInventoryFromApi({
        lat: coords.lat,
        lng: coords.lng,
        maxResults: input.maxResults,
      });
    } else {
      rows = await fetchPlacesLodgingNearby({
        lat: coords.lat,
        lng: coords.lng,
        maxResults: input.maxResults,
      });
    }
  }

  if (rows.length > 0) {
    return {
      rows: withStayWindow(input.event, rows),
      source: "google_places",
    };
  }

  const place = resolveContextPlaceLabel(input.event);
  const anchor = coords ?? resolveContextLodgingSearchCoords(input.event, input);
  if (!anchor) {
    return { rows: [], source: "mock" };
  }
  return {
    rows: withStayWindow(input.event, [...resolveLodgingMockForPlace(place, anchor)]),
    source: "mock",
  };
}
