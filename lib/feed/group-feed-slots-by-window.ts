import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import {
  dateKeyFromMs,
  resolveSlotStartMs,
  todayKey,
  tomorrowKey,
} from "@/lib/feed/resolve-slot-start-ms";

export type FeedSlotWindowId = "today" | "tomorrow" | "later" | "unset";

export type FeedSlotWindowGroup = {
  id: FeedSlotWindowId;
  label: string;
  slots: FeedTodaySlot[];
};

export type FeedSlotWindowLabels = {
  today: string;
  tomorrow: string;
  later: string;
  unset: string;
};

export function resolveFeedSlotWindowId(
  slot: FeedTodaySlot,
  now = new Date(),
): FeedSlotWindowId {
  const startMs = resolveSlotStartMs(slot);
  if (startMs === null) {
    return "unset";
  }
  const key = dateKeyFromMs(startMs);
  if (key === todayKey(now)) {
    return "today";
  }
  if (key === tomorrowKey(now)) {
    return "tomorrow";
  }
  if (startMs < now.getTime()) {
    return "today";
  }
  return "later";
}

const WINDOW_ORDER: FeedSlotWindowId[] = ["today", "tomorrow", "later", "unset"];

/** Chronological mental buckets — 오늘 → 내일 → 이후. */
export function groupFeedSlotsByWindow(
  slots: readonly FeedTodaySlot[],
  labels: FeedSlotWindowLabels,
  now = new Date(),
): FeedSlotWindowGroup[] {
  const buckets = new Map<FeedSlotWindowId, FeedTodaySlot[]>();
  for (const id of WINDOW_ORDER) {
    buckets.set(id, []);
  }

  for (const slot of slots) {
    const id = resolveFeedSlotWindowId(slot, now);
    buckets.get(id)!.push(slot);
  }

  const sortByStart = (list: FeedTodaySlot[]) =>
    [...list].sort((left, right) => {
      const leftMs = resolveSlotStartMs(left) ?? Number.MAX_SAFE_INTEGER;
      const rightMs = resolveSlotStartMs(right) ?? Number.MAX_SAFE_INTEGER;
      return leftMs - rightMs;
    });

  const labelById: Record<FeedSlotWindowId, string> = {
    today: labels.today,
    tomorrow: labels.tomorrow,
    later: labels.later,
    unset: labels.unset,
  };

  return WINDOW_ORDER.map((id) => ({
    id,
    label: labelById[id],
    slots: sortByStart(buckets.get(id) ?? []),
  })).filter((group) => group.slots.length > 0);
}
