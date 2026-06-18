import type { EventCandidate } from "@/lib/events/event-candidate";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import type { PersonalGlobePin } from "@/lib/globe/personal-globe-pin-types";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";

/** Pin-only cluster when event row was pruned but personal pin remains. */
export function buildPinClusterFromPersonalPin(pin: PersonalGlobePin): PinCluster {
  return {
    pinId: pin.pinId,
    eventId: pin.eventId,
    title: pin.experienceTitle.trim() || pin.placeLabel.trim() || "경험",
    placeLabel: pin.placeLabel.trim() || "장소",
    lat: pin.lat,
    lng: pin.lng,
    dateLabel: formatPinDateLabel(pin.createdAtIso),
    startedAtIso: pin.createdAtIso,
    evidence: {
      photoCount: pin.photoCount,
      videoCount: pin.videoCount,
      chatCount: 0,
      placePinCount: pin.placeLabel.trim() ? 1 : 0,
    },
    recallLine: null,
  };
}

/** Immediate pin-open preview after manual globe context create. */
export function buildPinClusterFromEvent(
  event: EventCandidate,
  pin?: PersonalGlobePin | null,
): PinCluster {
  const coords = resolveEventGlobeCoords(event);
  const { photoCount, videoCount } = countEventMedia(event);
  const captures = readFeedCaptureFragments(event);
  const chatCount = captures.filter(
    (row) => row.kind === "memo" || row.kind === "link",
  ).length;

  return {
    pinId: pin?.pinId ?? `pgpin:${event.id}`,
    eventId: event.id,
    title: pin?.experienceTitle?.trim() || event.title.trim() || "경험",
    placeLabel: pin?.placeLabel?.trim() || coords.placeLabel,
    lat: pin?.lat ?? coords.lat,
    lng: pin?.lng ?? coords.lng,
    dateLabel: formatPinDateLabel(event.datetime ?? pin?.createdAtIso),
    startedAtIso: event.datetime?.trim() || pin?.createdAtIso || null,
    evidence: {
      photoCount: Math.max(photoCount, pin?.photoCount ?? 0),
      videoCount: Math.max(videoCount, pin?.videoCount ?? 0),
      chatCount,
      placePinCount: event.place?.trim() ? 1 : 0,
    },
    recallLine: null,
  };
}
