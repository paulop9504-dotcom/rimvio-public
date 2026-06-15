import { NextResponse } from "next/server";
import { fetchWeatherContext } from "@/lib/context-resolver/weather/fetch-weather-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();

  if (!location) {
    return NextResponse.json({ error: "location_required" }, { status: 400 });
  }

  const weather = await fetchWeatherContext(location);
  return NextResponse.json(weather);
}
