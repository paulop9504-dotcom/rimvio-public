import type {
  FeedTimelineAggregate,
  FeedTimelineAggregateChip,
} from "@/lib/feed/feed-timeline-aggregate-types";
import { formatDwellMinutesLabel } from "@/lib/feed/project-dwell-from-gps-pings";

/** Chip row for Feed timeline card — 📷 14 · 42분 체류 · 친구 2 · 링크 1 */
export function formatFeedTimelineAggregateChips(
  aggregate: FeedTimelineAggregate,
): FeedTimelineAggregateChip[] {
  if (!aggregate.hasContent) {
    return [];
  }

  const chips: FeedTimelineAggregateChip[] = [];

  if (aggregate.photos > 0) {
    chips.push({
      id: "photos",
      emoji: "📷",
      label: String(aggregate.photos),
    });
  }
  if (aggregate.videos > 0) {
    chips.push({
      id: "videos",
      label: `영상 ${aggregate.videos}`,
    });
  }
  if (aggregate.dwellMinutes !== null) {
    chips.push({
      id: "dwell",
      label: formatDwellMinutesLabel(aggregate.dwellMinutes),
    });
  }
  if (aggregate.friendCount > 0) {
    const names = aggregate.friendLabels.slice(0, 2).join("·");
    chips.push({
      id: "friends",
      label:
        aggregate.friendCount === 1 && names
          ? names
          : `친구 ${aggregate.friendCount}${names ? ` · ${names}` : ""}`,
    });
  }
  if (aggregate.links > 0) {
    chips.push({
      id: "links",
      label: `링크 ${aggregate.links}`,
    });
  }
  if (aggregate.memos > 0) {
    chips.push({
      id: "memos",
      label: `메모 ${aggregate.memos}`,
    });
  }

  return chips;
}

export function formatFeedTimelineAggregateLine(
  aggregate: FeedTimelineAggregate,
): string | null {
  const chips = formatFeedTimelineAggregateChips(aggregate);
  if (chips.length === 0) {
    return null;
  }
  return chips
    .map((chip) => (chip.emoji ? `${chip.emoji} ${chip.label}` : chip.label))
    .join(" · ");
}
