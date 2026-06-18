export const EVENT_REALTIME_UPDATED = "rimvio-realtime-updated";

export function emitRealtimeUpdated(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_REALTIME_UPDATED));
}
