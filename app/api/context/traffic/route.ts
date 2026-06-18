import { NextResponse } from "next/server";
import { fetchTrafficContext } from "@/lib/traffic/fetch-traffic-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get("destination")?.trim();
  const origin = searchParams.get("origin")?.trim() ?? null;

  if (!destination) {
    return NextResponse.json({ error: "destination_required" }, { status: 400 });
  }

  const traffic = await fetchTrafficContext({
    destination,
    originHint: origin,
  });

  return NextResponse.json(traffic);
}
