import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "@/lib/auth/api-auth";
import { EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M } from "@/lib/globe/server-external-globe-traces";
import { fetchExternalGlobeTracesNearServer } from "@/lib/globe/server-fetch-external-globe-traces-near";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function readCoord(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** P2 — discover others' external experience traces near a point. */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ traces: [] });
  }

  const auth = await requireAuthUser();
  if ("response" in auth) {
    return auth.response;
  }
  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const params = request.nextUrl.searchParams;
    const lat = readCoord(params.get("lat"));
    const lng = readCoord(params.get("lng"));
    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
    }

    const radiusRaw = readCoord(params.get("radiusM"));
    const radiusM = radiusRaw ?? EXTERNAL_GLOBE_TRACE_DEFAULT_RADIUS_M;

    const traces = await fetchExternalGlobeTracesNearServer({
      lat,
      lng,
      radiusM,
      excludeUserId: userId,
    });

    return NextResponse.json({ traces });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "fetch_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
