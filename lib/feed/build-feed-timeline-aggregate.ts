import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedSlotPeerContext } from "@/lib/feed/feed-slot-peer-context-types";
import {
  readDwellMinutesFromCaptures,
  readFeedCaptureStats,
} from "@/lib/feed/feed-capture-metadata";
import type { FeedTimelineAggregate } from "@/lib/feed/feed-timeline-aggregate-types";
import { projectDwellMinutesFromGpsPings } from "@/lib/feed/project-dwell-from-gps-pings";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";
import type { GpsPing } from "@/lib/location-ping/types";

function collectFriendLabels(
  peers: readonly FeedSlotPeerContext[],
  plan: PlanContext | null | undefined,
): { count: number; labels: string[] } {
  const seen = new Set<string>();
  const labels: string[] = [];

  const push = (threadId: string, displayName: string) => {
    const key = threadId.trim();
    const name = displayName.trim();
    if (!key || !name || seen.has(key)) {
      return;
    }
    seen.add(key);
    labels.push(name);
  };

  for (const peer of peers) {
    push(peer.peerThreadId, peer.displayName);
  }

  if (plan?.peerDisplayName?.trim() && plan.peerThreadId?.trim()) {
    push(plan.peerThreadId, plan.peerDisplayName);
  } else if (plan?.peerDisplayName?.trim()) {
    const name = plan.peerDisplayName.trim();
    if (!labels.some((label) => label === name)) {
      labels.push(name);
    }
  }

  return { count: labels.length, labels: labels.slice(0, 3) };
}

/** Pure read — timeline stats for a Feed slot's backing event. */
export function buildFeedTimelineAggregate(input: {
  event: EventCandidate | null | undefined;
  plan?: PlanContext | null;
  peers?: readonly FeedSlotPeerContext[];
  gpsPings?: readonly GpsPing[];
}): FeedTimelineAggregate {
  const stats = readFeedCaptureStats(input.event);
  const friends = collectFriendLabels(input.peers ?? [], input.plan);

  let dwellMinutes = readDwellMinutesFromCaptures(input.event);
  if (dwellMinutes === null && input.event?.datetime?.trim() && (input.gpsPings?.length ?? 0) > 0) {
    dwellMinutes = projectDwellMinutesFromGpsPings({
      pings: input.gpsPings ?? [],
      windowStartIso: input.event.datetime,
      windowEndIso: input.plan?.windowEndIso ?? null,
      placeLabel: input.plan?.place ?? input.event.place ?? null,
    });
  }

  const hasContent =
    stats.photos > 0 ||
    stats.videos > 0 ||
    stats.links > 0 ||
    stats.memos > 0 ||
    dwellMinutes !== null ||
    friends.count > 0;

  return {
    photos: stats.photos,
    videos: stats.videos,
    links: stats.links,
    memos: stats.memos,
    dwellMinutes,
    friendCount: friends.count,
    friendLabels: friends.labels,
    hasContent,
  };
}
