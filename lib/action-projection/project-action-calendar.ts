import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import type { CalendarEventChip } from "@/lib/calendar/calendar-view-types";
import type { ActionProjectionEntry } from "@/lib/action-projection/types";

function dateKeyFrom(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function actionProjectionToActiveEntry(
  entry: ActionProjectionEntry
): ActiveActionEntry {
  const primary = entry.actions[0];
  return {
    id: `projection:${entry.ecId}`,
    messageId: null,
    linkId: null,
    reminderId: null,
    kind: "projected_event",
    title: entry.title,
    subtitle: primary ? `${primary.label} 외 ${entry.actions.length}개` : "행동 제안",
    fireAt: entry.startAt,
    placeName: null,
    actionCount: entry.actions.length,
    countdownLabel: primary?.label ?? null,
  };
}

/** Action Calendar — behavior projection view (not Event SSOT). */
export function projectActionCalendarChips(
  entries: readonly ActionProjectionEntry[],
  anchor = new Date()
): CalendarEventChip[] {
  const fallback = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());

  return entries.map((entry) => {
    const parsed = parseActionTargetDatetime(entry.startAt) ?? fallback;
    const activeEntry = actionProjectionToActiveEntry(entry);
    return {
      id: `action:${entry.ecId}`,
      layer: "action",
      eventId: entry.ecId,
      entry: activeEntry,
      title: entry.title,
      dateKey: dateKeyFrom(parsed),
      startMs: parsed.getTime(),
      hour: parsed.getHours(),
      minute: parsed.getMinutes(),
      tone: "blue",
      hasTime: entry.startAt.includes("T"),
      projectedActions: entry.actions,
    };
  });
}
