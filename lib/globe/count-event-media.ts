import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";

export function countEventMedia(event: EventCandidate | null | undefined): {
  photoCount: number;
  videoCount: number;
} {
  const captures = readFeedCaptureFragments(event);
  let photoCount = 0;
  let videoCount = 0;
  for (const row of captures) {
    if (row.kind === "photo") {
      photoCount += 1;
    } else if (row.kind === "video") {
      videoCount += 1;
    }
  }
  return { photoCount, videoCount };
}
