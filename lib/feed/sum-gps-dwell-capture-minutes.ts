import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";

/** Sum all gps_dwell fragment minutes on an event (place-time ledger). */
export function sumGpsDwellCaptureMinutes(
  event: EventCandidate | null | undefined,
): number {
  if (!event) {
    return 0;
  }
  const fromFragments = readFeedCaptureFragments(event)
    .filter((row) => row.kind === "gps_dwell")
    .reduce((sum, row) => sum + (row.dwellMinutes ?? 0), 0);
  const meta = event.metadata?.gpsDwellMinutes;
  const fromMeta = typeof meta === "number" && meta > 0 ? meta : 0;
  return Math.max(fromFragments, fromMeta);
}
