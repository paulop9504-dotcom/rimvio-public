import { fetchWeatherContext } from "@/lib/context-resolver/weather/fetch-weather-context";
import type { ContextProvider, ContextResolveInput, WeatherContext } from "@/lib/context-resolver/types";

/** WeatherProvider — JIT only; never stored on event registration. */
export class WeatherProvider implements ContextProvider<WeatherContext> {
  readonly id = "weather";

  /** LLM-friendly weather snapshot for a location string. */
  async getContext(location: string): Promise<WeatherContext> {
    const trimmed = location.trim();
    if (!trimmed) {
      return fetchWeatherContext("Seoul");
    }

    if (typeof window !== "undefined") {
      try {
        const response = await fetch(
          `/api/context/weather?location=${encodeURIComponent(trimmed)}`
        );
        if (response.ok) {
          return (await response.json()) as WeatherContext;
        }
      } catch {
        // fall through to server fetch on SSR/tests
      }
    }

    return fetchWeatherContext(trimmed);
  }

  async resolve(input: ContextResolveInput): Promise<WeatherContext> {
    const location =
      input.event.location?.trim() ||
      input.event.origin_hint?.trim() ||
      input.event.title?.trim() ||
      "Seoul";

    return this.getContext(location);
  }
}

export const weatherProvider = new WeatherProvider();
