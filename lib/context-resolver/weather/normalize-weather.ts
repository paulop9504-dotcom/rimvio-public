import type { WeatherContext } from "@/lib/context-resolver/types";
import { mapCondition } from "@/lib/context-resolver/weather/open-weather-condition";

export type OpenWeatherMainBlock = {
  temp?: number;
  feels_like?: number;
  humidity?: number;
};

export type OpenWeatherResponse = {
  name?: string;
  main?: OpenWeatherMainBlock;
  weather?: Array<{ main?: string; description?: string }>;
  rain?: { "1h"?: number };
  wind?: { speed?: number };
};

export function normalizeOpenWeatherResponse(
  data: OpenWeatherResponse,
  locationLabel: string
): WeatherContext {
  const mainLabel = data.weather?.[0]?.main ?? "Unknown";
  const description = data.weather?.[0]?.description ?? mainLabel;
  const tempC = Math.round(data.main?.temp ?? 20);
  const feelsLike = data.main?.feels_like ?? tempC;
  const condition = mapCondition(mainLabel);
  const rainy = condition === "rain" || Boolean(data.rain?.["1h"]);
  const isUnpleasant = tempC > 30 || feelsLike > 32 || rainy || condition === "snow";

  const humidity = data.main?.humidity;

  return {
    condition: rainy && condition !== "snow" ? "rain" : condition,
    condition_label: mainLabel,
    summary: description,
    temp_c: tempC,
    feels_like_c: Math.round(feelsLike),
    humidity_pct: typeof humidity === "number" ? Math.round(humidity) : undefined,
    precipitation_chance: rainy ? 0.85 : condition === "clear" ? 0.1 : 0.35,
    is_unpleasant: isUnpleasant,
    location_label: data.name ?? locationLabel,
  };
}

export function fallbackWeatherContext(location: string): WeatherContext {
  const hour = new Date().getHours();
  const rainySeason = hour >= 14 && hour <= 20;

  if (rainySeason) {
    return {
      condition: "rain",
      condition_label: "Rain",
      summary: "비",
      temp_c: 22,
      feels_like_c: 23,
      precipitation_chance: 0.72,
      is_unpleasant: true,
      location_label: location,
    };
  }

  return {
    condition: "clear",
    condition_label: "Clear",
    summary: "맑음",
    temp_c: 24,
    feels_like_c: 25,
    precipitation_chance: 0.12,
    is_unpleasant: false,
    location_label: location,
  };
}
