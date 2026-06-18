const GPS_TRACKING_KEY = "rimvio.gps-tracking.v1";

export const GPS_TRACKING_UPDATED = "rimvio-gps-tracking-updated";

let memoryEnabled: boolean | null = null;

function readStored(): boolean {
  if (memoryEnabled !== null) {
    return memoryEnabled;
  }
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const raw = localStorage.getItem(GPS_TRACKING_KEY);
    if (raw === "off") {
      return false;
    }
    if (raw === "on") {
      return true;
    }
  } catch {
    /* ignore */
  }
  return true;
}

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GPS_TRACKING_UPDATED));
  }
}

/** GPS ingest gate — sensor on/off, not product mode. */
export function isGpsTrackingEnabled(): boolean {
  return readStored();
}

export function setGpsTrackingEnabled(enabled: boolean): void {
  memoryEnabled = enabled;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(GPS_TRACKING_KEY, enabled ? "on" : "off");
    } catch {
      /* ignore */
    }
    emitUpdated();
  }
}
