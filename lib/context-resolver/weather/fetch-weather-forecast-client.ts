import type { WeatherContext } from "@/lib/context-resolver/types";

export type WeatherForecastClientPayload = {
  prep_line: string | null;
  weather: WeatherContext | null;
  target_at?: string;
};

/** Browser read path — schedule-matched forecast + prep one-liner. */
export async function fetchWeatherForecastClient(input: {
  location: string;
  targetIso: string;
}): Promise<WeatherForecastClientPayload | null> {
  const location = input.location.trim();
  const targetIso = input.targetIso.trim();
  if (!location || !targetIso || typeof window === "undefined") {
    return null;
  }

  try {
    const params = new URLSearchParams({ location, at: targetIso });
    const response = await fetch(`/api/context/weather/forecast?${params.toString()}`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as WeatherForecastClientPayload;
  } catch {
    return null;
  }
}
