import { buildGlobeContextMediaRecallCaption } from "@/lib/globe/build-context-media-recall-caption";
import type { ContextMediaReelItem } from "@/lib/globe/project-context-media-reel";
import { projectExperienceHeroFromEvent } from "@/lib/globe/project-experience-hero";
import { projectRelationshipMeaningLine } from "@/lib/copy/project-relationship-meaning-line";
import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { formatPinDateLabel } from "@/lib/globe/format-pin-date-label";

function formatElapsedSince(iso: string | null | undefined, now: Date): string | null {
  if (!iso?.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  const diffMs = now.getTime() - ms;
  if (diffMs < 0) {
    return null;
  }
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) {
    return "오늘의 순간";
  }
  if (days < 7) {
    return `${days}일 전의 순간`;
  }
  if (days < 45) {
    const weeks = Math.max(1, Math.round(days / 7));
    return `${weeks}주 전의 순간`;
  }
  const months = Math.max(1, Math.round(days / 30));
  if (months < 24) {
    return `${months}개월 전의 순간`;
  }
  const years = Math.max(1, Math.round(days / 365));
  return `${years}년 전의 순간`;
}

export type BridgeContextRecallProjection = {
  primary: string;
  secondary: string | null;
  dateLabel: string | null;
};

/** Bridge 맥락 탭 — relationship · time recall hero line. */
export function buildBridgeContextRecallLine(input: {
  event: EventCandidate;
  allEvents: readonly EventCandidate[];
  reelItems: readonly ContextMediaReelItem[];
  volume?: ExperienceVolume | null;
  viewerUserId?: string | null;
  now?: Date;
}): BridgeContextRecallProjection {
  const now = input.now ?? new Date();
  const hero = projectExperienceHeroFromEvent({
    event: input.event,
    volume: input.volume,
    allEvents: input.allEvents,
  });

  const anchorItem = input.reelItems[0] ?? null;
  const caption = anchorItem
    ? buildGlobeContextMediaRecallCaption({
        event: input.event,
        volume: input.volume,
        item: anchorItem,
        viewerUserId: input.viewerUserId,
        now,
      })
    : null;

  const primary =
    hero?.recallLine?.trim() ||
    caption?.trim() ||
    input.event.title.trim() ||
    "그때 거기";

  const plan = readPlanContextFromEvent(input.event);
  const peerName = plan?.peerDisplayName?.trim();
  const meaning = peerName
    ? projectRelationshipMeaningLine({
        displayName: peerName,
        events: input.allEvents,
        now,
      })
    : null;

  const startedAtIso =
    input.volume?.time.startIso?.trim() ||
    input.event.datetime?.trim() ||
    anchorItem?.capturedAtIso?.trim() ||
    null;

  const secondary =
    meaning?.line?.trim() ||
    formatElapsedSince(startedAtIso, now) ||
    null;

  return {
    primary,
    secondary,
    dateLabel: formatPinDateLabel(startedAtIso),
  };
}
