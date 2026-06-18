import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import { humanizeFeedHeadline } from "@/lib/feed/humanize-feed-headline";
import {
  flattenFeedQueueSections,
  resolveFeedQueueSections,
} from "@/lib/feed/resolve-feed-queue-sections";
import type { FeedTodaySlot } from "@/lib/feed/feed-today-slot-types";
import type { RankedSurface, SurfaceType } from "@/lib/surface-engine/surface-contract";
import type { SurfaceNode } from "@/lib/surface-composition/surface-node-contract";
import { isFallbackSurface } from "@/lib/surface-engine/surface-ux-state";

export const FEED_TODAY_SLOT_MAX = 4;

const MS_24H = 24 * 60 * 60 * 1000;

const FOOD_SIGNAL = /(?:치킨|식당|카페|저녁|점심|만나|약속|맛집|스타벅스)/iu;
const TRAVEL_SIGNAL = /(?:오사카|여행|공항|항공|출국|체크인|탑승|trip|flight|hotel|숙소)/iu;

export type FeedTodaySlotPartition = {
  today: readonly FeedTodaySlot[];
  overflow: readonly RankedSurface[];
};

function inferSlotTypeFromText(text: string): SurfaceType {
  if (TRAVEL_SIGNAL.test(text)) {
    return "travel";
  }
  if (FOOD_SIGNAL.test(text)) {
    return "food";
  }
  return "schedule";
}

function surfaceDedupeKey(surface: RankedSurface): string {
  const eventId = surface.events[0]?.eventId;
  if (eventId) {
    return `ec:${eventId}`;
  }
  return `surface:${surface.id}`;
}

function calendarDedupeKey(row: UnifiedCalendarOverlayRow): string {
  if (row.event.eventId) {
    return `ec:${row.event.eventId}`;
  }
  return `calendar:${row.id}`;
}

function isRelevantCalendarRow(row: UnifiedCalendarOverlayRow, now: Date): boolean {
  const nowMs = now.getTime();
  return row.event.startMs >= nowMs - MS_24H;
}

function inferCalendarSlotType(row: UnifiedCalendarOverlayRow): SurfaceType {
  const text = [row.prompt_hint, row.context_lines?.join(" "), row.event.title]
    .filter(Boolean)
    .join(" ");
  return inferSlotTypeFromText(text);
}

function formatRelativeDay(dateKey: string, now: Date): string {
  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (dateKey === todayKey) {
    return "오늘";
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, "0"),
    String(tomorrow.getDate()).padStart(2, "0"),
  ].join("-");

  if (dateKey === tomorrowKey) {
    return "내일";
  }

  const [, month, day] = dateKey.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function padClock(hour: number, minute: number): string {
  if (!Number.isFinite(hour)) {
    return "";
  }
  const suffix = minute > 0 ? ` ${minute}분` : "시";
  return `${hour}${suffix}`;
}

/** Headline for calendar-backed slots (약속 문장 스타일). */
export function deriveCalendarSlotHeadline(
  row: UnifiedCalendarOverlayRow,
  now = new Date(),
): string {
  const hint = row.prompt_hint?.trim();
  if (hint) {
    return humanizeFeedHeadline(hint);
  }

  const context = row.context_lines?.[0]?.trim();
  if (context) {
    return context;
  }

  const title = row.event.title.trim();
  const day = formatRelativeDay(row.event.dateKey, now);
  const clock = row.event.hasTime ? padClock(row.event.hour, row.event.minute) : "";
  if (clock) {
    return `${day} ${clock} ${title}`;
  }
  return `${day} ${title}`;
}

export function deriveCalendarSlotContext(row: UnifiedCalendarOverlayRow): string | null {
  const headline = deriveCalendarSlotHeadline(row);
  const title = row.event.title.trim();
  if (!title || title === headline) {
    return null;
  }
  return title;
}

function surfaceSlotsFromQueue(
  primary: SurfaceNode | null,
  latent: readonly RankedSurface[],
): FeedTodaySurfaceSlot[] {
  const queuePrimary =
    primary && !isFallbackSurface(primary) ? (primary as RankedSurface) : null;
  const rows = flattenFeedQueueSections(resolveFeedQueueSections(queuePrimary, latent));
  return rows.map((surface) => ({
    kind: "surface" as const,
    id: `surface:${surface.id}`,
    surface,
  }));
}

function calendarSlotsFromOverlay(
  overlayRows: readonly UnifiedCalendarOverlayRow[],
  seen: Set<string>,
  now: Date,
): FeedTodayCalendarSlot[] {
  const slots: FeedTodayCalendarSlot[] = [];

  for (const row of overlayRows) {
    if (!isRelevantCalendarRow(row, now)) {
      continue;
    }
    const key = calendarDedupeKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    slots.push({
      kind: "calendar",
      id: `calendar:${row.id}`,
      row,
      slotType: inferCalendarSlotType(row),
    });
  }

  return slots.sort((left, right) => left.row.event.startMs - right.row.event.startMs);
}

/**
 * Feed today slots — surface queue plus calendar overlay (same source as 📅 badge).
 */
export function buildFeedTodaySlots(input: {
  primary: SurfaceNode | null;
  latent: readonly RankedSurface[];
  overlayRows: readonly UnifiedCalendarOverlayRow[];
  now?: Date;
}): FeedTodaySlotPartition {
  const now = input.now ?? new Date();
  const seen = new Set<string>();
  const merged: FeedTodaySlot[] = [];

  for (const slot of surfaceSlotsFromQueue(input.primary, input.latent)) {
    seen.add(surfaceDedupeKey(slot.surface));
    merged.push(slot);
  }

  for (const slot of calendarSlotsFromOverlay(input.overlayRows, seen, now)) {
    merged.push(slot);
  }

  const today = merged.slice(0, FEED_TODAY_SLOT_MAX);
  const overflow = flattenFeedQueueSections(
    resolveFeedQueueSections(
      input.primary && !isFallbackSurface(input.primary) ? input.primary : null,
      input.latent,
    ),
  ).slice(FEED_TODAY_SLOT_MAX);

  return { today, overflow };
}
