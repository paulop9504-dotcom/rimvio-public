/** Default GPS sampling — e.g. one ping every 3 minutes while the app is open. */
export const GPS_PING_INTERVAL_MS = 3 * 60 * 1000;

/** Slower ring-buffer sampling while dwelling or UI is backgrounded. */
export const GPS_PING_INTERVAL_DWELL_MS = 10 * 60 * 1000;

/** Keep pings for 48 hours (enough for same-day uploads). */
export const GPS_PING_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export const GPS_PING_MAX_COUNT = 500;

/** Match upload time to a ping within ±15 minutes. */
export const GPS_PING_MATCH_WINDOW_MS = 15 * 60 * 1000;

/** Fall back to the latest ping within 30 minutes before upload. */
export const GPS_PING_FALLBACK_LOOKBACK_MS = 30 * 60 * 1000;
