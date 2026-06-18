import { NextResponse } from "next/server";
import { composeWeatherPrepLine } from "@/lib/plan-context/compose-weather-prep-line";
import { fetchWeatherForecastAt } from "@/lib/context-resolver/weather/fetch-weather-forecast";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();
  const at = searchParams.get("at")?.trim();

  if (!location || !at) {
    return NextResponse.json({ error: "location_and_at_required" }, { status: 400 });
  }

  const targetAt = new Date(at);
  if (Number.isNaN(targetAt.getTime())) {
    return NextResponse.json({ error: "invalid_at" }, { status: 400 });
  }

  const forecast = await fetchWeatherForecastAt({ location, targetAt });
  if (!forecast) {
    return NextResponse.json({ prep_line: null, weather: null });
  }

  const prep_line = composeWeatherPrepLine({
    weather: forecast,
    targetAt,
  });

  return NextResponse.json({
    prep_line,
    weather: forecast,
    target_at: forecast.target_at,
  });
}
