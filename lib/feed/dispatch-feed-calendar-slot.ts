import type { CalendarOverlayAction } from "@/lib/calendar/calendar-view-types";
import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";

export type FeedCalendarSlotHandlers = {
  onSpawnPrompt?: (uri: string) => void;
  onFireScheduledNow?: (messageId: string) => void;
  onOpenCalendar?: () => void;
};

export function dispatchFeedCalendarSlotAction(
  row: UnifiedCalendarOverlayRow,
  action: CalendarOverlayAction,
  handlers: FeedCalendarSlotHandlers,
): void {
  if (action.deeplink?.trim()) {
    openSpawnAction({
      deeplink: action.deeplink,
      onPrompt: handlers.onSpawnPrompt,
    });
    return;
  }

  const entry = action.entry ?? row.event.entry;
  if (entry?.messageId && entry.kind === "scheduled_nav") {
    handlers.onFireScheduledNow?.(entry.messageId);
    return;
  }

  if (entry?.messageId && entry.kind === "pending_confirm") {
    handlers.onOpenCalendar?.();
    return;
  }

  handlers.onOpenCalendar?.();
}
