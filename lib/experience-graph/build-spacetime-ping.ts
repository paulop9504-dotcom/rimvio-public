import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { experienceEventTypeById } from "@/lib/experience-graph/experience-event-type-spec";
import type { SpacetimePingNavLinks, SpacetimePingPayload } from "@/lib/experience-graph/spacetime-ping-types";
import type { SpatialMediaItem } from "@/lib/experience-graph/spatial-media-types";
import type { WeatherContext } from "@/lib/context-resolver/types";
import {
  buildKakaoMapRouteHref,
  buildKakaoMapRouteWebHref,
  buildKakaoMapSearchHref,
} from "@/lib/resolvers/deep-links";
import { weatherPrepEmoji } from "@/lib/plan-context/weather-prep-visual";

export function buildSpacetimePingFromMedia(input: {
  item: SpatialMediaItem;
  volume?: ExperienceVolume;
  weather?: WeatherContext | null;
}): SpacetimePingPayload {
  const eventType = input.volume?.eventType ?? "schedule";

  return {
    id: input.item.id,
    title: input.item.title,
    caption: input.item.caption,
    capturedAtIso: input.item.capturedAtIso,
    placeLabel: input.item.placeLabel,
    lat: input.item.lat,
    lng: input.item.lng,
    mediaKind: input.item.kind,
    eventType,
    peerDisplayName: input.volume?.peerDisplayName ?? null,
    weather: input.weather ?? null,
  };
}

export function buildSpacetimePingNavLinks(ping: Pick<
  SpacetimePingPayload,
  "lat" | "lng" | "placeLabel"
>): SpacetimePingNavLinks {
  return {
    routeDeeplink: buildKakaoMapRouteHref({
      lat: ping.lat,
      lng: ping.lng,
      placeLabel: ping.placeLabel,
    }),
    routeWebHref: buildKakaoMapRouteWebHref({
      lat: ping.lat,
      lng: ping.lng,
      placeLabel: ping.placeLabel,
    }),
    searchDeeplink: buildKakaoMapSearchHref(ping.placeLabel),
  };
}

export function formatSpacetimePingTimestamp(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function formatSpacetimePingWeatherLines(
  weather: WeatherContext | null | undefined,
): { primary: string; secondary: string; emoji: string } {
  if (!weather) {
    return {
      emoji: "🌤️",
      primary: "날씨 불러오는 중",
      secondary: "온도 · 습도",
    };
  }

  const temp = weather.temp_c != null ? `${weather.temp_c}°C` : "—";
  const humidity =
    weather.humidity_pct != null ? `습도 ${weather.humidity_pct}%` : "습도 —";
  const summary = weather.summary?.trim() || weather.condition_label || "날씨";

  return {
    emoji: weatherPrepEmoji(weather.condition),
    primary: temp,
    secondary: `${humidity} · ${summary}`,
  };
}

export function spacetimePingTypeEmoji(eventType: SpacetimePingPayload["eventType"]): string {
  return experienceEventTypeById(eventType).emoji;
}
