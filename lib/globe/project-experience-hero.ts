import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { projectExperienceRoom } from "@/lib/experience-room/project-experience-room";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { resolveRecallCandidates } from "@/lib/recall/resolve-recall-candidates";
import type { RecallAnchor } from "@/lib/recall/recall-types";

export type ExperienceHeroProjection = {
  title: string;
  date: string | null;
  place: string;
  peopleCount: number;
  photoCount: number;
  videoCount: number;
  heroImageContextId: string | null;
  recallLine: string | null;
};

function resolvePlaceLabel(
  event: EventCandidate,
  volume: ExperienceVolume | null | undefined,
): string {
  const plan = readPlanContextFromEvent(event);
  const raw =
    plan?.place?.trim() ||
    event.place?.trim() ||
    volume?.space.label?.trim() ||
    event.title.trim();
  return raw || "장소";
}

function resolveHeroImageContextId(
  event: EventCandidate | null | undefined,
): string | null {
  const captures = readFeedCaptureFragments(event)
    .filter((row) => row.kind === "photo" && row.mediaContextId?.trim())
    .sort(
      (left, right) =>
        Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso),
    );
  return captures[0]?.mediaContextId?.trim() ?? null;
}

function resolveRecallLine(
  event: EventCandidate,
  allEvents: readonly EventCandidate[],
): string | null {
  const plan = readPlanContextFromEvent(event);
  const anchor: RecallAnchor = {
    eventId: null,
    title: event.title,
    place: event.place ?? plan?.place ?? null,
    peerDisplayName: plan?.peerDisplayName ?? null,
    datetimeIso: new Date().toISOString(),
  };
  const candidates = resolveRecallCandidates({
    anchor,
    events: allEvents,
    limit: 12,
  });
  const hit =
    candidates.find((row) => row.eventId === event.id) ?? candidates[0] ?? null;
  return hit?.headline?.trim() || hit?.reason?.trim() || null;
}

import type { PinCluster } from "@/lib/globe/pin-cluster-types";

export function projectExperienceHeroFromCluster(
  cluster: PinCluster,
): ExperienceHeroProjection {
  return {
    title: cluster.title.trim() || "경험",
    date: cluster.dateLabel,
    place: cluster.placeLabel.trim() || "장소",
    peopleCount: 0,
    photoCount: cluster.evidence.photoCount,
    videoCount: cluster.evidence.videoCount,
    heroImageContextId: null,
    recallLine: cluster.recallLine,
  };
}

export function projectExperienceHeroFromEvent(input: {
  event: EventCandidate | null | undefined;
  volume?: ExperienceVolume | null;
  allEvents?: readonly EventCandidate[];
}): ExperienceHeroProjection | null {
  const event = input.event;
  if (!event) {
    return null;
  }

  const volume = input.volume ?? null;
  const { photoCount, videoCount } = countEventMedia(event);
  const room = projectExperienceRoom({ primaryEvent: event });
  const startedAtIso =
    volume?.time.startIso?.trim() || event.datetime?.trim() || null;

  return {
    title: volume?.title.trim() || event.title.trim() || "경험",
    date: formatPinDateLabel(startedAtIso),
    place: resolvePlaceLabel(event, volume),
    peopleCount: room.participants.length,
    photoCount,
    videoCount,
    heroImageContextId: resolveHeroImageContextId(event),
    recallLine: input.allEvents
      ? resolveRecallLine(event, input.allEvents)
      : null,
  };
}
