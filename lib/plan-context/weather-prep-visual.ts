import type { WeatherCondition } from "@/lib/context-resolver/types";

export function weatherPrepEmoji(condition: WeatherCondition): string {
  switch (condition) {
    case "rain":
      return "🌧️";
    case "snow":
      return "❄️";
    case "wind":
      return "💨";
    case "clear":
      return "☀️";
    default:
      return "🌤️";
  }
}
