import { NextResponse, type NextRequest } from "next/server";
import { resolveManualContextPlaceCandidates } from "@/lib/globe/resolve-manual-context-place-candidates";

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
  const place = (params.get("place") ?? params.get("q") ?? "").trim();
  if (!place) {
    return NextResponse.json({ error: "place_required" }, { status: 400 });
  }

  const title = params.get("title")?.trim() || null;
  const userLat = parseCoord(params.get("lat"));
  const userLng = parseCoord(params.get("lng"));

  const result = await resolveManualContextPlaceCandidates({
    place,
    title,
    userLat,
    userLng,
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
