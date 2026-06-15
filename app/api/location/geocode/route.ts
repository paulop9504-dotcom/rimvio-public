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

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? params.get("query") ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "query_required" }, { status: 400 });
  }

  const lat = parseCoord(params.get("lat"));
  const lng = parseCoord(params.get("lng"));
  const origin = lat != null && lng != null ? { lat, lng } : null;

  const suggestions = await resolveAreaGeocodeCandidates({
    areaToken: q,
    maxResults: 8,
    origin,
    radiusKm: origin ? 60 : undefined,
  });

  return NextResponse.json({
    ok: true,
    query: q,
    suggestions,
  });
}
