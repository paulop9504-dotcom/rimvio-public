import type { WeatherCondition } from "@/lib/context-resolver/types";

export function mapCondition(main?: string): WeatherCondition {
  const key = (main ?? "").toLowerCase();
  if (key.includes("rain") || key.includes("drizzle") || key.includes("thunder")) {
    return "rain";
  }
  if (key.includes("snow")) {
    return "snow";
  }
  if (key.includes("wind") || key.includes("squall") || key.includes("tornado")) {
    return "wind";
  }
  if (key.includes("clear") || key.includes("cloud")) {
    return key.includes("clear") ? "clear" : "clear";
  }
  return "unknown";
}
