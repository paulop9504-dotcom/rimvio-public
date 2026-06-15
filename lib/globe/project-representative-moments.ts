import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { projectVolumeSpatialMedia } from "@/lib/experience-graph/project-volume-spatial-media";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";

export type RepresentativeMoment = {
  id: string;
  label: string;
  capturedAtIso: string | null;
  mediaContextId: string | null;
  /** SpatialMediaItem.id when playback should start on [열기]. */
  spatialItemId: string | null;
  source: "capture" | "peak" | "spatial";
};

function labelFromCapture(
  row: ReturnType<typeof readFeedCaptureFragments>[number],
): string {
  const custom = row.label?.trim();
  if (custom) {
    return custom;
  }
  if (row.kind === "photo") {
    return "사진";
  }
  if (row.kind === "video") {
    return "영상";
  }
  return "기록";
}

/** 1 captures → 2 peaks → 3 spatial media; max 3 labels. */
export function projectRepresentativeMoments(input: {
  event: EventCandidate | null | undefined;
  volume: ExperienceVolume | null | undefined;
  limit?: number;
}): RepresentativeMoment[] {
  const limit = input.limit ?? 3;
  const moments: RepresentativeMoment[] = [];
  const seen = new Set<string>();

  const push = (moment: RepresentativeMoment) => {
    const key = moment.label.trim().toLowerCase();
    if (!key || seen.has(key) || moments.length >= limit) {
      return;
    }
    seen.add(key);
    moments.push(moment);
  };

  const captures = readFeedCaptureFragments(input.event)
    .filter((row) => row.kind === "photo" || row.kind === "video")
    .sort(
      (left, right) =>
        Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso),
    );

  for (const row of captures) {
    push({
      id: `capture:${row.id}`,
      label: labelFromCapture(row),
      capturedAtIso: row.capturedAtIso,
      mediaContextId: row.mediaContextId ?? null,
      spatialItemId: null,
      source: "capture",
    });
  }

  for (const peak of input.volume?.peaks ?? []) {
    push({
      id: `peak:${peak.id}`,
      label: peak.label.trim() || peak.queryHint.trim() || "장면",
      capturedAtIso: peak.timeAt ?? input.volume?.time.startIso ?? null,
      mediaContextId: null,
      spatialItemId: null,
      source: "peak",
    });
  }

  if (input.volume) {
    const spatial = projectVolumeSpatialMedia(input.volume)
      .filter((row) => row.kind === "photo" || row.kind === "video")
      .sort(
        (left, right) =>
          Date.parse(left.capturedAtIso) - Date.parse(right.capturedAtIso),
      );
    for (const row of spatial) {
      push({
        id: `spatial:${row.id}`,
        label: row.title.trim() || row.caption?.trim() || "장면",
        capturedAtIso: row.capturedAtIso,
        mediaContextId: null,
        spatialItemId: row.id,
        source: "spatial",
      });
    }
  }

  return moments.slice(0, limit);
}

export function representativeMomentLabels(
  input: Parameters<typeof projectRepresentativeMoments>[0],
): string[] {
  return projectRepresentativeMoments(input).map((row) => row.label);
}
