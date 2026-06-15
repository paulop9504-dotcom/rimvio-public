import type { UnifiedCalendarOverlayRow } from "@/lib/calendar/calendar-view-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { deriveCalendarSlotContext } from "@/lib/feed/build-feed-today-slots";
import { deriveCalendarSlotTimeLabel } from "@/lib/feed/derive-slot-time-label";
import { formatPeerWithLabel } from "@/lib/copy/korean-peer-with";
import { formatPlanWindowLabel } from "@/lib/plan-context/format-plan-window-label";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import type { PlanContext } from "@/lib/plan-context/plan-context-types";

export function indexEventsById(
  events: readonly EventCandidate[],
): ReadonlyMap<string, EventCandidate> {
  return new Map(events.map((event) => [event.id, event]));
}

/** Pure read — calendar row → living plan context from Event SSOT. */
export function resolvePlanContextForCalendarRow(
  row: UnifiedCalendarOverlayRow,
  eventsById: ReadonlyMap<string, EventCandidate>,
): PlanContext | null {
  const eventId = row.event.eventId?.trim();
  if (!eventId) {
    return null;
  }
  const event = eventsById.get(eventId);
  if (!event) {
    return null;
  }
  return readPlanContextFromEvent(event);
}

/** Prefer plan window (6/12–6/15) over single-slot clock when metadata exists. */
export function derivePlanAwareSlotTimeLabel(
  row: UnifiedCalendarOverlayRow,
  plan: PlanContext | null,
  now = new Date(),
): string {
  if (plan) {
    const windowLabel = formatPlanWindowLabel({
      windowStartIso: plan.windowStartIso,
      windowEndIso: plan.windowEndIso,
      nights: plan.nights,
      windowConfidence: plan.windowConfidence,
    });
    if (windowLabel) {
      return windowLabel;
    }
  }
  return deriveCalendarSlotTimeLabel(row, now);
}

/** Place · peers from plan (weather prep renders in its own feed strip). */
export function derivePlanAwareSlotContext(
  row: UnifiedCalendarOverlayRow,
  plan: PlanContext | null,
): string | null {
  const parts: string[] = [];
  if (plan?.place?.trim()) {
    parts.push(plan.place.trim());
  }
  const peerLabel = formatPeerWithLabel(plan?.peerDisplayName ?? "");
  if (peerLabel) {
    parts.push(peerLabel);
  }
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return deriveCalendarSlotContext(row);
}
