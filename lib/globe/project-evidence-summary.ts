import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { countEventMedia } from "@/lib/globe/count-event-media";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export const EVIDENCE_ORDER = [
  "photo",
  "video",
  "gps",
  "schedule",
  "link",
  "memo",
] as const;

export type EvidenceKind = (typeof EVIDENCE_ORDER)[number];

export type EvidenceSummaryRow = {
  kind: EvidenceKind;
  label: string;
  count: number;
};

const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  photo: "사진",
  video: "영상",
  gps: "GPS",
  schedule: "일정",
  link: "링크",
  memo: "메모",
};

/** Fixed evidence rows — people/chat live in People + Conversation sections. */
export function projectEvidenceSummary(input: {
  event: EventCandidate | null | undefined;
  volume?: ExperienceVolume | null;
}): EvidenceSummaryRow[] {
  const event = input.event;
  const captures = readFeedCaptureFragments(event);
  const { photoCount, videoCount } = countEventMedia(event);
  const gpsCount =
    captures.filter((row) => row.kind === "gps_dwell").length +
    (event?.place?.trim() ? 1 : 0);
  const plan = event ? readPlanContextFromEvent(event) : null;
  const scheduleCount = plan || event?.datetime?.trim() ? 1 : 0;
  const linkCount = captures.filter((row) => row.kind === "link").length;
  const memoCount = captures.filter((row) => row.kind === "memo").length;
  const counts: Record<EvidenceKind, number> = {
    photo: photoCount,
    video: videoCount,
    gps: gpsCount,
    schedule: scheduleCount,
    link: linkCount,
    memo: memoCount,
  };

  return EVIDENCE_ORDER.map((kind) => ({
    kind,
    label: EVIDENCE_LABEL[kind],
    count: counts[kind],
  }));
}
