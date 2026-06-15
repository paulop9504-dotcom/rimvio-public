import type { LinkActionItem } from "@/types/database";
import type { PlaceDiscoveryCriteria } from "@/lib/context-resolver/places/types";
import type { PlaceDiscoveryContext } from "@/lib/context-resolver/places/types";

export type EventCriticality = "LOW" | "MEDIUM" | "HIGH";

/** Layer 1 — immutable event truth (container storage only). */
export type PersistentEvent = {
  id: string;
  title: string;
  start_time: string;
  location: string;
  meeting_url?: string | null;
  origin_hint?: string | null;
  safety_buffer_minutes?: number;
  criticality?: EventCriticality;
};

export type WeatherCondition = "clear" | "rain" | "snow" | "wind" | "unknown";

export type WeatherContext = {
  condition: WeatherCondition;
  condition_label?: string;
  summary: string;
  temp_c?: number;
  feels_like_c?: number;
  humidity_pct?: number;
  precipitation_chance?: number;
  is_unpleasant?: boolean;
  location_label?: string;
};

export type TrafficContext = {
  travel_minutes: number;
  delay_minutes: number;
  distance_label?: string;
};

export type LocationContext = {
  label: string;
  city?: string;
  lat?: number;
  lng?: number;
};

export type CalendarContext = {
  current_time: string;
  minutes_until_event: number;
  event_title: string;
};

/** Layer 2 — JIT snapshot assembled by Context Resolver registry. */
export type ContextSnapshot = {
  resolved_at: string;
  weather: WeatherContext;
  traffic: TrafficContext;
  location: LocationContext;
  calendar: CalendarContext;
  place?: PlaceDiscoveryContext | null;
};

export type CompiledTravelActionType = "OPEN_NAVIGATION" | "JOIN_MEETING" | "OPEN_CALENDAR";

/** Layer 3 — rule/logic output consumed by Action Engine + UI. */
export type CompiledTravelAction = {
  show_at: string;
  action: CompiledTravelActionType;
  summary: string;
  reason: string;
  context: ContextSnapshot;
  actions: LinkActionItem[];
};

export type ContextResolveInput = {
  event: PersistentEvent;
  now?: Date;
  discovery?: {
    origin: { lat: number; lng: number };
    criteria: PlaceDiscoveryCriteria;
  };
};

export interface ContextProvider<T> {
  readonly id: string;
  resolve(input: ContextResolveInput): Promise<T>;
}

export const DEFAULT_SAFETY_BUFFER_MIN = 5;
export const JIT_LOOKAHEAD_MS = 2 * 60 * 60 * 1000;
export const WEATHER_RAIN_EXTRA_BUFFER_MIN = 10;
