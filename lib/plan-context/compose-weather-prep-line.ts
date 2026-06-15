import type { WeatherContext } from "@/lib/context-resolver/types";

function formatShortDate(when: Date, now: Date): string | null {
  if (when.toDateString() === now.toDateString()) {
    return null;
  }
  return `${when.getMonth() + 1}/${when.getDate()}`;
}

function shouldSkipMildWeather(
  weather: WeatherContext,
  hoursUntil: number,
): boolean {
  const precip = weather.precipitation_chance ?? 0;
  if (weather.condition === "rain" || weather.condition === "snow") {
    return false;
  }
  if (weather.is_unpleasant) {
    return false;
  }
  if (precip >= 0.45) {
    return false;
  }
  if ((weather.temp_c ?? 0) >= 30 || (weather.feels_like_c ?? 0) >= 32) {
    return false;
  }
  return hoursUntil > 6 || (weather.condition === "clear" && precip < 0.3);
}

/**
 * One-line weather prep copy for feed context — actionable, not a forecast report.
 * Returns null when weather is mild enough to stay quiet.
 */
export function composeWeatherPrepLine(input: {
  weather: WeatherContext;
  targetAt: Date;
  now?: Date;
}): string | null {
  const now = input.now ?? new Date();
  const targetAt = input.targetAt;
  if (Number.isNaN(targetAt.getTime())) {
    return null;
  }

  const hoursUntil = (targetAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursUntil < -2) {
    return null;
  }

  const weather = input.weather;
  if (shouldSkipMildWeather(weather, hoursUntil)) {
    return null;
  }

  const datePrefix = formatShortDate(targetAt, now);
  const prefix = hoursUntil <= 3 && hoursUntil >= 0 ? "곧 " : datePrefix ? `${datePrefix} ` : "";

  const precip = weather.precipitation_chance ?? 0;
  const precipPct = Math.round(precip * 100);

  if (weather.condition === "snow") {
    return `${prefix}눈 예상 · 이동·방한 준비`;
  }

  if (weather.condition === "rain" || precip >= 0.5) {
    if (precipPct >= 55) {
      return `${prefix}비 ${precipPct}% · 우산·실내 일정`;
    }
    return `${prefix}비 예상 · 우산 챙기기`;
  }

  if ((weather.temp_c ?? 0) >= 30 || (weather.feels_like_c ?? 0) >= 32) {
    const temp = weather.temp_c ?? weather.feels_like_c;
    return `${prefix}한낮 ${temp}° · 오전·저녁 이동`;
  }

  if (weather.condition === "wind" || weather.is_unpleasant) {
    const summary = weather.summary?.trim() || "날씨 변동";
    return `${prefix}${summary} · 이동 여유 두기`;
  }

  if (precip >= 0.4) {
    return `${prefix}비 ${precipPct}% · 우산 챙기기`;
  }

  return null;
}
