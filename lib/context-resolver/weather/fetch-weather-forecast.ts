import type { WeatherContext } from "@/lib/context-resolver/types";
import { fetchWeatherContext, openWeatherApiKey } from "@/lib/context-resolver/weather/fetch-weather-context";
import { mapCondition } from "@/lib/context-resolver/weather/open-weather-condition";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const FORECAST_HORIZON_MS = 5 * 24 * 60 * 60 * 1000;

export type WeatherForecastSnapshot = WeatherContext & {
  target_at: string;
};

type ForecastListItem = {
  dt: number;
  main?: { temp?: number; feels_like?: number; humidity?: number };
  weather?: Array<{ main?: string; description?: string }>;
  pop?: number;
};

type ForecastResponse = {
  city?: { name?: string };
  list?: ForecastListItem[];
};

function normalizeForecastItem(
  item: ForecastListItem,
  locationLabel: string,
): WeatherContext {
  const mainLabel = item.weather?.[0]?.main ?? "Unknown";
  const description = item.weather?.[0]?.description ?? mainLabel;
  const tempC = Math.round(item.main?.temp ?? 20);
  const feelsLike = Math.round(item.main?.feels_like ?? tempC);
  const condition = mapCondition(mainLabel);
  const precip = item.pop ?? (condition === "rain" ? 0.7 : 0.15);
  const rainy = condition === "rain" || precip >= 0.55;
  const isUnpleasant =
    tempC > 30 || feelsLike > 32 || rainy || condition === "snow";

  const humidity = item.main?.humidity;

  return {
    condition: rainy && condition !== "snow" ? "rain" : condition,
    condition_label: mainLabel,
    summary: description,
    temp_c: tempC,
    feels_like_c: feelsLike,
    humidity_pct: typeof humidity === "number" ? Math.round(humidity) : undefined,
    precipitation_chance: precip,
    is_unpleasant: isUnpleasant,
    location_label: locationLabel,
  };
}

function pickClosestForecast(
  list: readonly ForecastListItem[],
  targetMs: number,
): ForecastListItem | null {
  if (list.length === 0) {
    return null;
  }

  let best = list[0]!;
  let bestDiff = Math.abs(best.dt * 1000 - targetMs);

  for (const item of list) {
    const diff = Math.abs(item.dt * 1000 - targetMs);
    if (diff < bestDiff) {
      best = item;
      bestDiff = diff;
    }
  }

  return best;
}

/** Forecast at plan start time — OpenWeather 5-day/3h; near-term falls back to current weather. */
export async function fetchWeatherForecastAt(input: {
  location: string;
  targetAt: Date;
}): Promise<WeatherForecastSnapshot | null> {
  const location = input.location.trim();
  const targetAt = input.targetAt;
  if (!location || Number.isNaN(targetAt.getTime())) {
    return null;
  }

  const targetIso = targetAt.toISOString();
  const now = Date.now();
  const delta = targetAt.getTime() - now;

  if (delta < -2 * 60 * 60 * 1000) {
    return null;
  }

  if (delta <= 2 * 60 * 60 * 1000) {
    const current = await fetchWeatherContext(location);
    return { ...current, target_at: targetIso };
  }

  const apiKey = openWeatherApiKey();
  if (!apiKey) {
    const fallback = await fetchWeatherContext(location);
    return { ...fallback, target_at: targetIso };
  }

  if (delta > FORECAST_HORIZON_MS) {
    return null;
  }

  try {
    const url = `${FORECAST_URL}?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=kr`;
    const response = await fetch(url, { next: { revalidate: 900 } });
    if (!response.ok) {
      const fallback = await fetchWeatherContext(location);
      return { ...fallback, target_at: targetIso };
    }

    const data = (await response.json()) as ForecastResponse;
    const picked = pickClosestForecast(data.list ?? [], targetAt.getTime());
    if (!picked) {
      return null;
    }

    const label = data.city?.name ?? location;
    return {
      ...normalizeForecastItem(picked, label),
      target_at: targetIso,
    };
  } catch {
    const fallback = await fetchWeatherContext(location);
    return { ...fallback, target_at: targetIso };
  }
}
