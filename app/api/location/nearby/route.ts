import { NextResponse, type NextRequest } from "next/server";
import { resolveAreaGeocodeCandidates } from "@/lib/event-commit-gate/resolve-area-geocode-candidates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** GPS 기준으로 동명 후보를 가까운 순으로 좁힙니다. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? params.get("query") ?? "").trim();
  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));

  if (!q) {
    return NextResponse.json({ error: "query_required" }, { status: 400 });
  }
  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  const suggestions = await resolveAreaGeocodeCandidates({
    areaToken: q,
    maxResults: 8,
    origin: { lat, lng },
    radiusKm: 35,
  });

  return NextResponse.json({
    ok: true,
    query: q,
    origin: { lat, lng },
    suggestions,
  });
}
