import type { BlinkAnalyticsEvent } from "@/lib/analytics/types";

export function flushAnalyticsEvent(event: BlinkAnalyticsEvent) {
  if (typeof window === "undefined") {
    return;
  }

  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {
    // Non-blocking — localStorage remains source of truth offline.
  });
}
