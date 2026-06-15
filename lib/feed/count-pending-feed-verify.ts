import type { EventCandidate } from "@/lib/events/event-candidate";
import { hasPendingFeedCaptureVerify } from "@/lib/feed/feed-capture-metadata";

/** How many backing events on today's feed still need 맞아요. */
export function countPendingFeedVerifyEvents(
  events: Iterable<EventCandidate> | null | undefined,
): number {
  if (!events) {
    return 0;
  }
  let count = 0;
  for (const event of events) {
    if (hasPendingFeedCaptureVerify(event)) {
      count += 1;
    }
  }
  return count;
}
