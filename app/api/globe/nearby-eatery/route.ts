import { NextResponse, type NextRequest } from "next/server";
import { resolveNearbyEateryAtCoords } from "@/lib/globe/resolve-nearby-eatery-at-coords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** GPS capture point — closest restaurant/cafe POI within ~120m. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));

  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  const candidate = await resolveNearbyEateryAtCoords({ lat, lng });
  if (!candidate) {
    return NextResponse.json({ ok: true, candidate: null });
  }

  return NextResponse.json({ ok: true, candidate });
}
