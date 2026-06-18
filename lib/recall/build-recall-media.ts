import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import type { RecallMedia } from "@/lib/recall/recall-types";

/** Pick best recall thumbnail from event captures. */
export function buildRecallMedia(
  event: EventCandidate,
): RecallMedia {
  const captures = readFeedCaptureFragments(event);
  const photo =
    captures.find((row) => row.kind === "photo" && row.verified) ??
    captures.find((row) => row.kind === "photo");
  if (photo) {
    return {
      kind: "photo",
      captureId: photo.id,
      url: photo.url,
      placeLabel: photo.placeLabel,
      capturedAtIso: photo.capturedAtIso,
    };
  }

  const video =
    captures.find((row) => row.kind === "video" && row.verified) ??
    captures.find((row) => row.kind === "video");
  if (video) {
    return {
      kind: "video",
      captureId: video.id,
      url: video.url,
      placeLabel: video.placeLabel,
      capturedAtIso: video.capturedAtIso,
    };
  }

  const dwell = captures.find((row) => row.kind === "gps_dwell");
  if (dwell) {
    return {
      kind: "globe_pin",
      captureId: dwell.id,
      placeLabel: dwell.placeLabel,
      capturedAtIso: dwell.capturedAtIso,
    };
  }

  return { kind: "none" };
}
