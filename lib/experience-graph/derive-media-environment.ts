import type { WeatherCondition } from "@/lib/context-resolver/types";
import type {
  SpatialSeason,
  SpatialTimeOfDay,
} from "@/lib/experience-graph/spatial-media-types";

const TIME_OF_DAY_LABEL: Record<SpatialTimeOfDay, string> = {
  dawn: "새벽",
  morning: "아침",
  afternoon: "낮",
  evening: "저녁",
  night: "밤",
};

export const SEASON_LABEL: Record<SpatialSeason, string> = {
  spring: "봄",
  summer: "여름",
  autumn: "가을",
  winter: "겨울",
};

const WEATHER_LABEL: Record<WeatherCondition, string> = {
  clear: "맑음",
  rain: "비",
  snow: "눈",
  wind: "바람",
  unknown: "날씨 미정",
};

export function resolveTimeOfDay(date: Date): SpatialTimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 7) {
    return "dawn";
  }
  if (hour >= 7 && hour < 12) {
    return "morning";
  }
  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }
  if (hour >= 17 && hour < 21) {
    return "evening";
  }
  return "night";
}

export function resolveSeason(date: Date): SpatialSeason {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) {
    return "spring";
  }
  if (month >= 6 && month <= 8) {
    return "summer";
  }
  if (month >= 9 && month <= 11) {
    return "autumn";
  }
  return "winter";
}

export function formatSpatialTimeLabel(iso: string, locale = "ko-KR"): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString(locale, {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function inferWeatherForMoment(input: {
  season: SpatialSeason;
  timeOfDay: SpatialTimeOfDay;
  placeLabel: string;
}): { condition: WeatherCondition; label: string; temperatureC: number } {
  const coastal = /제주|부산|해운대|바다/u.test(input.placeLabel);
  let temperatureC = 20;

  switch (input.season) {
    case "spring":
      temperatureC = coastal ? 18 : 16;
      break;
    case "summer":
      temperatureC = coastal ? 28 : 30;
      break;
    case "autumn":
      temperatureC = coastal ? 20 : 17;
      break;
    case "winter":
      temperatureC = coastal ? 8 : 3;
      break;
  }

  if (input.timeOfDay === "evening" || input.timeOfDay === "night") {
    temperatureC -= 3;
  }
  if (input.timeOfDay === "afternoon" && input.season === "summer") {
    temperatureC += 2;
  }

  const condition: WeatherCondition =
    input.season === "summer" && input.timeOfDay === "afternoon"
      ? "clear"
      : input.season === "winter"
        ? "clear"
        : "clear";

  return {
    condition,
    label: WEATHER_LABEL[condition],
    temperatureC,
  };
}

export function formatEnvironmentLabel(input: {
  timeOfDay: SpatialTimeOfDay;
  season: SpatialSeason;
  weatherLabel: string;
  temperatureC?: number | null;
}): string {
  const parts = [
    TIME_OF_DAY_LABEL[input.timeOfDay],
    SEASON_LABEL[input.season],
    input.weatherLabel,
  ];
  if (input.temperatureC != null) {
    parts.push(`${Math.round(input.temperatureC)}°`);
  }
  return parts.join(" · ");
}

export function timeOfDayLabel(timeOfDay: SpatialTimeOfDay): string {
  return TIME_OF_DAY_LABEL[timeOfDay];
}

export function seasonLabel(season: SpatialSeason): string {
  return SEASON_LABEL[season];
}
