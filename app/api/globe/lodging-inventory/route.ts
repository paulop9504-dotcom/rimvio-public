import { NextResponse, type NextRequest } from "next/server";
import { fetchPlacesLodgingNearby } from "@/lib/globe/context-hub/fetch-places-lodging-nearby";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Context lodging Hub factory — Google Places Nearby (lodging). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));
  const maxRaw = parseCoord(params.get("max"));
  const maxResults = maxRaw != null ? Math.min(Math.max(Math.round(maxRaw), 1), 8) : 5;

  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  const inventory = await fetchPlacesLodgingNearby({ lat, lng, maxResults });

  return NextResponse.json({
    ok: true,
    inventory,
    source: inventory.length > 0 ? "google_places" : "empty",
  });
}
