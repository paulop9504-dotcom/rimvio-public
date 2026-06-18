/**
 * JIT API wake-up — provider ids (extend when Hub factory adds sync sources).
 * @see docs/GLOBE_HUB_RESOURCE.md §9
 */

export type ApiWakeupPhase = "cold" | "warm" | "hot";

export type ApiProviderId =
  | "weather_forecast"
  | "flight_status"
  | "ticket_ingest"
  | "queue_times"
  | "places_lodging";

export type ApiWakeupContext = {
  nowIso: string;
  lat: number | null;
  lng: number | null;
  eventStartIso: string;
  eventEndIso?: string | null;
  eventPlace?: string | null;
  eventLat?: number | null;
  eventLng?: number | null;
  /** When false, hot polling backs off (mobile background). */
  appForeground?: boolean;
  lastSyncedAtIso?: string | null;
};

export type ApiWakeupDecision = {
  providerId: ApiProviderId;
  phase: ApiWakeupPhase;
  allowFetch: boolean;
  /** null = no polling loop */
  pollIntervalMs: number | null;
  reason: string;
};

export type ApiProviderWakeupPolicy = {
  id: ApiProviderId;
  cold: { allowFetch: boolean; pollIntervalMs: number | null };
  warm: { allowFetch: boolean; pollIntervalMs: number | null };
  hot: { allowFetch: boolean; pollIntervalMs: number | null };
  /** Skip fetch if synced within this window for the phase. */
  minSyncGapMs: { warm: number; hot: number };
};

export const API_WAKEUP_COLD_LEAD_MS = 24 * 60 * 60 * 1000;
export const API_WAKEUP_HOT_LEAD_MS = 2 * 60 * 60 * 1000;
export const API_WAKEUP_HOT_DISTANCE_KM = 5;
export const API_WAKEUP_QUEUE_HOT_DISTANCE_KM = 3;
export const API_WAKEUP_LODGING_HOT_DISTANCE_KM = 25;

export const BACKGROUND_POLL_MULTIPLIER = 4;
