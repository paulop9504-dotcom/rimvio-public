import type {
  ApiProviderId,
  ApiProviderWakeupPolicy,
} from "@/lib/globe/resource/api-wakeup-types";

/** Per-provider poll policy — all external fetch must register here. */
export const API_WAKEUP_POLICIES: Record<ApiProviderId, ApiProviderWakeupPolicy> = {
  weather_forecast: {
    id: "weather_forecast",
    cold: { allowFetch: false, pollIntervalMs: null },
    warm: { allowFetch: true, pollIntervalMs: 30 * 60 * 1000 },
    hot: { allowFetch: true, pollIntervalMs: 20 * 60 * 1000 },
    minSyncGapMs: { warm: 25 * 60 * 1000, hot: 15 * 60 * 1000 },
  },
  flight_status: {
    id: "flight_status",
    cold: { allowFetch: false, pollIntervalMs: null },
    warm: { allowFetch: true, pollIntervalMs: 12 * 60 * 60 * 1000 },
    hot: { allowFetch: true, pollIntervalMs: 5 * 60 * 1000 },
    minSyncGapMs: { warm: 10 * 60 * 60 * 1000, hot: 4 * 60 * 1000 },
  },
  ticket_ingest: {
    id: "ticket_ingest",
    cold: { allowFetch: true, pollIntervalMs: 24 * 60 * 60 * 1000 },
    warm: { allowFetch: true, pollIntervalMs: 6 * 60 * 60 * 1000 },
    hot: { allowFetch: false, pollIntervalMs: null },
    minSyncGapMs: { warm: 5 * 60 * 60 * 1000, hot: 0 },
  },
  queue_times: {
    id: "queue_times",
    cold: { allowFetch: false, pollIntervalMs: null },
    warm: { allowFetch: false, pollIntervalMs: null },
    hot: { allowFetch: true, pollIntervalMs: 5 * 60 * 1000 },
    minSyncGapMs: { warm: 0, hot: 4 * 60 * 1000 },
  },
  places_lodging: {
    id: "places_lodging",
    cold: { allowFetch: false, pollIntervalMs: null },
    warm: { allowFetch: true, pollIntervalMs: 6 * 60 * 60 * 1000 },
    hot: { allowFetch: true, pollIntervalMs: 30 * 60 * 1000 },
    minSyncGapMs: { warm: 5 * 60 * 60 * 1000, hot: 20 * 60 * 1000 },
  },
};

export function readApiWakeupPolicy(providerId: ApiProviderId): ApiProviderWakeupPolicy {
  return API_WAKEUP_POLICIES[providerId];
}
