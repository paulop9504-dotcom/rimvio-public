import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import {
  buildExperienceGraphFromEvents,
  indexExperienceVolumesByEventId,
} from "@/lib/experience-graph/build-experience-graph";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";

export type GlobeContextPrimaryVideo = {
  mediaContextId: string;
  label: string;
  capturedAtIso: string;
};

function resolveFromMediaStore(eventId: string): GlobeContextPrimaryVideo | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  const videos = readMediaContextMemorySnapshot()
    .filter((row) => row.mediaKind === "video")
    .filter((row) => {
      const ref = row.originRef?.trim();
      return ref === key;
    })
    .sort(
      (left, right) =>
        Date.parse(right.capturedAtIso) - Date.parse(left.capturedAtIso),
    );

  const latest = videos[0];
  if (!latest?.id.trim()) {
    return null;
  }

  return {
    mediaContextId: latest.id.trim(),
    label: latest.placeLabel?.trim() || "동영상",
    capturedAtIso: latest.capturedAtIso,
  };
}

/** Latest uploaded video attached to a globe context — map replay spine. */
export function resolveGlobeContextPrimaryVideo(
  event: EventCandidate | null | undefined,
): GlobeContextPrimaryVideo | null {
  if (!event) {
    return null;
  }

  const videos = readFeedCaptureFragments(event)
    .filter((row) => row.kind === "video" && row.mediaContextId?.trim())
    .sort(
      (left, right) =>
        Date.parse(right.capturedAtIso) - Date.parse(left.capturedAtIso),
    );

  const latest = videos[0];
  if (latest?.mediaContextId?.trim()) {
    return {
      mediaContextId: latest.mediaContextId.trim(),
      label: latest.label?.trim() || latest.placeLabel?.trim() || "동영상",
      capturedAtIso: latest.capturedAtIso,
    };
  }

  return resolveFromMediaStore(event.id);
}

export function globeContextHasVideo(
  event: EventCandidate | null | undefined,
): boolean {
  if (!event) {
    return false;
  }
  if (resolveGlobeContextPrimaryVideo(event)) {
    return true;
  }
  return readFeedCaptureFragments(event).some((row) => row.kind === "video");
}

export function resolveExperienceVolumeForEvent(
  eventId: string,
): ExperienceVolume | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }
  const graph = buildExperienceGraphFromEvents(listLifeEventCandidates());
  return indexExperienceVolumesByEventId(graph).get(key) ?? null;
}

/** Same sources as pin sheet reel — photo or video on map before bridge sheet. */
export function globeContextShouldMapReplayFirst(input: {
  event: EventCandidate | null | undefined;
  cluster?: PinCluster | null;
  volume?: ExperienceVolume | null;
}): boolean {
  const event = input.event;
  const volume =
    input.volume ??
    (event?.id ? resolveExperienceVolumeForEvent(event.id) : null);

  if (projectContextMediaReel({ event, volume }).length > 0) {
    return true;
  }
  if (globeContextHasVideo(event)) {
    return true;
  }
  return (input.cluster?.evidence.videoCount ?? 0) > 0 ||
    (input.cluster?.evidence.photoCount ?? 0) > 0;
}

/** Map replay video — feedCaptures, media store, then spatial reel fallback. */
export function resolveGlobeContextPrimaryVideoForMap(input: {
  event: EventCandidate | null | undefined;
  volume?: ExperienceVolume | null;
}): GlobeContextPrimaryVideo | null {
  const primary = resolveGlobeContextPrimaryVideo(input.event);
  if (primary) {
    return primary;
  }

  const volume =
    input.volume ??
    (input.event?.id ? resolveExperienceVolumeForEvent(input.event.id) : null);
  const firstVideo = projectContextMediaReel({ event: input.event, volume }).find(
    (row) => row.kind === "video" && row.mediaContextId?.trim(),
  );
  if (!firstVideo?.mediaContextId?.trim()) {
    return null;
  }

  return {
    mediaContextId: firstVideo.mediaContextId.trim(),
    label: firstVideo.label,
    capturedAtIso:
      firstVideo.capturedAtIso?.trim() || new Date().toISOString(),
  };
}
