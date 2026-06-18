const GCAL_SYNC_SESSION_KEY = "rimvio-gcal-last-sync-at";
const GCAL_SYNC_MIN_INTERVAL_MS = 30 * 60 * 1000;

export function shouldRunGoogleCalendarAutoSync(now = Date.now()): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }

  const raw = sessionStorage.getItem(GCAL_SYNC_SESSION_KEY);
  const last = raw ? Number(raw) : 0;
  if (!Number.isFinite(last) || last <= 0) {
    return true;
  }

  return now - last >= GCAL_SYNC_MIN_INTERVAL_MS;
}

export function markGoogleCalendarAutoSynced(now = Date.now()): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(GCAL_SYNC_SESSION_KEY, String(now));
}
