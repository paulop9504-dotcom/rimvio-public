import type {
  CalendarEventChip,
  CalendarOverlayAction,
  UnifiedCalendarOverlayRow,
} from "@/lib/calendar/calendar-view-types";
import { groupEventsByDay } from "@/lib/calendar/project-action-stream";
import type { CalendarDayBucket } from "@/lib/calendar/calendar-view-types";

const MS_24H = 24 * 60 * 60 * 1000;

function overlayActionsFromActionChip(chip: CalendarEventChip): CalendarOverlayAction[] {
  if (chip.projectedActions?.length) {
    return chip.projectedActions.map((action) => ({
      id: action.id,
      label: action.label,
      source: "projection" as const,
      entry: chip.entry ?? undefined,
      projectedAction: action,
    }));
  }

  if (!chip.entry) {
    return [];
  }

  return [
    {
      id: chip.id,
      label: chip.entry.countdownLabel ?? chip.title,
      source: "stream" as const,
      entry: chip.entry,
    },
  ];
}

function findNearestEventRow(
  rows: UnifiedCalendarOverlayRow[],
  actionStartMs: number,
  nowMs: number
): UnifiedCalendarOverlayRow | null {
  if (rows.length === 0) {
    return null;
  }

  let best: UnifiedCalendarOverlayRow | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    const delta = row.event.startMs - actionStartMs;
    const abs = Math.abs(delta);
    const withinWindow = abs <= MS_24H || row.event.startMs >= nowMs - MS_24H;
    if (!withinWindow && row.event.startMs < nowMs) {
      continue;
    }
    if (abs < bestDelta) {
      bestDelta = abs;
      best = row;
    }
  }

  if (best) {
    return best;
  }

  const future = rows
    .filter((row) => row.event.startMs >= nowMs)
    .sort((left, right) => left.event.startMs - right.event.startMs);
  return future[0] ?? rows[rows.length - 1] ?? null;
}

/**
 * Event base rows + action overlay. Action-only entries become standalone rows
 * (study timer, link reminders, scheduled nav without Event SSOT).
 */
export function composeUnifiedCalendarOverlay(
  eventChips: readonly CalendarEventChip[],
  actionChips: readonly CalendarEventChip[],
  now = new Date()
): UnifiedCalendarOverlayRow[] {
  const events = eventChips.filter((chip) => chip.layer === "event");
  const actions = actionChips.filter((chip) => chip.layer === "action");

  const rows: UnifiedCalendarOverlayRow[] = events.map((event) => ({
    id: event.id,
    event,
    overlayActions: [],
  }));

  const rowByEventId = new Map<string, UnifiedCalendarOverlayRow>();
  for (const row of rows) {
    if (row.event.eventId) {
      rowByEventId.set(row.event.eventId, row);
    }
  }

  const nowMs = now.getTime();
  const standalone: UnifiedCalendarOverlayRow[] = [];

  for (const actionChip of actions) {
    const overlays = overlayActionsFromActionChip(actionChip);

    let target =
      actionChip.eventId && rowByEventId.has(actionChip.eventId)
        ? rowByEventId.get(actionChip.eventId)!
        : null;

    if (!target) {
      target = findNearestEventRow(rows, actionChip.startMs, nowMs);
    }

    if (!target) {
      standalone.push({
        id: `standalone:${actionChip.id}`,
        event: actionChip,
        overlayActions: overlays,
      });
      continue;
    }

    const seen = new Set(target.overlayActions.map((item) => item.id));
    for (const overlay of overlays) {
      if (seen.has(overlay.id)) {
        continue;
      }
      seen.add(overlay.id);
      target.overlayActions.push(overlay);
    }
  }

  return [...rows, ...standalone].sort(
    (left, right) => left.event.startMs - right.event.startMs,
  );
}

export type UnifiedCalendarDayBucket = CalendarDayBucket & {
  overlayRows: UnifiedCalendarOverlayRow[];
};

export function groupOverlayRowsByDay(
  rows: readonly UnifiedCalendarOverlayRow[],
  rangeStart: Date,
  rangeEnd: Date,
  now = new Date()
): UnifiedCalendarDayBucket[] {
  const eventOnlyChips = rows.map((row) => row.event);
  const buckets = groupEventsByDay(eventOnlyChips, rangeStart, rangeEnd, now);

  return buckets.map((bucket) => ({
    ...bucket,
    overlayRows: rows
      .filter((row) => row.event.dateKey === bucket.dateKey)
      .sort((left, right) => left.event.startMs - right.event.startMs),
  }));
}

export type { CalendarOverlayAction, UnifiedCalendarOverlayRow };
