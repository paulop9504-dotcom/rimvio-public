import type { WeatherCondition } from "@/lib/context-resolver/types";

export type SpatialMediaKind = "photo" | "video" | "text" | "other";

export type SpatialTimeOfDay =
  | "dawn"
  | "morning"
  | "afternoon"
  | "evening"
  | "night";

export type SpatialSeason = "spring" | "summer" | "autumn" | "winter";

/** One browsable item inside a space — photo, clip, note, etc. */
export type SpatialMediaItem = {
  id: string;
  kind: SpatialMediaKind;
  title: string;
  caption?: string | null;
  capturedAtIso: string;
  placeLabel: string;
  clusterId: string;
  lat: number;
  lng: number;
  timeOfDay: SpatialTimeOfDay;
  season: SpatialSeason;
  weatherCondition: WeatherCondition;
  weatherLabel: string;
  temperatureC?: number | null;
  peakId?: string | null;
  durationSec?: number | null;
};

/** Unified frame — globe, clock, and environment move together. */
export type SpatialContextFrame = {
  mediaId: string;
  placeLabel: string;
  clusterId: string;
  lat: number;
  lng: number;
  capturedAtIso: string;
  timeLabel: string;
  timeOfDay: SpatialTimeOfDay;
  timeOfDayLabel: string;
  season: SpatialSeason;
  seasonLabel: string;
  weatherCondition: WeatherCondition;
  environmentLabel: string;
  temperatureC?: number | null;
};

export type SpatialGlobeView = {
  lat: number;
  lng: number;
  /** 0–100 — pin position on equirectangular map */
  pinX: number;
  pinY: number;
  zoom: number;
  placeLabel: string;
};
