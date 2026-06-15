import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";

export function resolveSlotStartMs(slot: FeedTodaySlot): number | null {
  if (slot.kind === "calendar") {
    return slot.row.event.startMs;
  }
  const startAt = slot.surface.events[0]?.startAt;
  if (!startAt) {
    return null;
  }
  return parseActionTargetDatetime(startAt)?.getTime() ?? null;
}

export function dateKeyFromMs(ms: number): string {
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(now = new Date()): string {
  return dateKeyFromMs(now.getTime());
}

export function tomorrowKey(now = new Date()): string {
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  return dateKeyFromMs(next.getTime());
}
