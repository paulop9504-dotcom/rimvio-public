import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { CalendarChipTone, CalendarEventChip } from "@/lib/calendar/calendar-view-types";
import { resolveCalendarScheduleOrigin } from "@/lib/calendar/resolve-calendar-schedule-origin";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readLifeProjections } from "@/lib/life-read-model";

export type EventCalendarRow = {
  eventId: string;
  title: string;
  startAt: string;
  startMs: number;
  category: EventCandidate["category"];
  sourceRef?: string;
};

function dateKeyFrom(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toneForCategory(category: EventCandidate["category"]): CalendarChipTone {
  switch (category) {
    case "travel":
      return "blue";
    case "schedule":
      return "teal";
    case "work":
      return "grey";
    default:
      return "green";
  }
}

function isFeedPlanEvent(event: EventCandidate): boolean {
  const meta = event.metadata ?? {};
  return (
    meta.feedPlanEnabled === true ||
    meta.planKind === "plan" ||
    Boolean(meta.planWindowEndIso)
  );
}

/** Event Calendar — read-only projection from Event SSOT (scheduled + active feed plans). */
export function listEventCalendarRows(): EventCalendarRow[] {
  return readLifeProjections()
    .events.filter(
      (event) =>
        event.lifecycle === "scheduled" ||
        (event.lifecycle === "active" && isFeedPlanEvent(event)),
    )
    .map((event) => {
      const iso = event.datetime?.trim();
      if (!iso) {
        return null;
      }
      const parsed = parseActionTargetDatetime(iso);
      if (!parsed) {
        return null;
      }
      const sourceRef =
        typeof event.metadata?.sourceRef === "string"
          ? event.metadata.sourceRef
          : undefined;

      return {
        eventId: event.id,
        title: event.title,
        startAt: iso,
        startMs: parsed.getTime(),
        category: event.category,
        sourceRef,
      };
    })
    .filter((row): row is EventCalendarRow => row !== null)
    .sort((left, right) => left.startMs - right.startMs);
}

export function projectEventCalendarChips(
  rows: readonly EventCalendarRow[],
  anchor = new Date()
): CalendarEventChip[] {
  const fallback = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());

  return rows.map((row) => {
    const parsed = parseActionTargetDatetime(row.startAt) ?? fallback;
    return {
      id: `event:${row.eventId}`,
      layer: "event",
      eventId: row.eventId,
      entry: null,
      title: row.title,
      dateKey: dateKeyFrom(parsed),
      startMs: parsed.getTime(),
      hour: parsed.getHours(),
      minute: parsed.getMinutes(),
      tone: toneForCategory(row.category),
      hasTime: row.startAt.includes("T"),
      scheduleOrigin: resolveCalendarScheduleOrigin({
        sourceRef: row.sourceRef,
        eventId: row.eventId,
      }),
    };
  });
}
