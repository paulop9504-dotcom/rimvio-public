export const FEED_SLOTS_REFRESH_EVENT = "rimvio-feed-slots-refresh";

export function emitFeedSlotsRefresh(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(FEED_SLOTS_REFRESH_EVENT));
}
