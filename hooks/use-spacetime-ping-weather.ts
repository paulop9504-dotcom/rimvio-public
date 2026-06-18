"use client";

import { useEffect, useState } from "react";
import type { WeatherContext } from "@/lib/context-resolver/types";
import { fetchWeatherForecastClient } from "@/lib/context-resolver/weather/fetch-weather-forecast-client";

/** Weather at ping time — for spacetime ping card side strip. */
export function useSpacetimePingWeather(input: {
  location?: string | null;
  capturedAtIso?: string | null;
}): WeatherContext | null {
  const location = input.location?.trim() ?? "";
  const capturedAtIso = input.capturedAtIso?.trim() ?? "";
  const [weather, setWeather] = useState<WeatherContext | null>(null);

  useEffect(() => {
    if (!location || !capturedAtIso) {
      setWeather(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const payload = await fetchWeatherForecastClient({
        location,
        targetIso: capturedAtIso,
      });
      if (cancelled) {
        return;
      }
      setWeather(payload?.weather ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [location, capturedAtIso]);

  return weather;
}
