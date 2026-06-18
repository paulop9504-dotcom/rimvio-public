import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import { enrichCalendarRowWithTieredActions } from "@/lib/action-decision/build-tiered-event-overlay-actions";
import { composeUnifiedCalendarOverlay } from "@/lib/calendar/compose-unified-calendar-overlay";
import { isEventInPrepSurfaceWindow } from "@/lib/calendar/resolve-schedule-prep-surface";
import type {
  CalendarEventChip,
  UnifiedCalendarOverlayRow,
} from "@/lib/calendar/calendar-view-types";
import {
  dedupeCalendarChips,
  projectKnowledgeCalendarChips,
} from "@/lib/calendar/project-knowledge-calendar-chips";
import { projectCalendarEvents } from "@/lib/calendar/project-action-stream";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";

export type ActionCalendarSnapshot = {
  eventChips: CalendarEventChip[];
  actionChips: CalendarEventChip[];
  overlayRows: UnifiedCalendarOverlayRow[];
  rowCount: number;
  attachedActionCount: number;
};

/**
 * Single read model for Action Calendar — merges Event SSOT, projections,
 * chat stream, and persisted knowledge calendar entries.
 */
export function buildActionCalendar(input: {
  eventChips: readonly CalendarEventChip[];
  projectionActionChips: readonly CalendarEventChip[];
  streamActions: readonly ActiveActionEntry[];
  knowledgeEntities?: readonly KnowledgeEntity[];
  anchor?: Date;
  now?: Date;
}): ActionCalendarSnapshot {
  const anchor = input.anchor ?? new Date();
  const now = input.now ?? new Date();

  const streamChips = projectCalendarEvents(input.streamActions, anchor);
  const knowledgeChips = projectKnowledgeCalendarChips(
    input.knowledgeEntities ?? [],
    now,
  );

  const actionChips = dedupeCalendarChips([
    ...input.projectionActionChips,
    ...streamChips,
    ...knowledgeChips,
  ]);

  const mergedRows = composeUnifiedCalendarOverlay(
    input.eventChips,
    actionChips,
    now,
  );

  const overlayRows = mergedRows.map((row) => {
    if (
      row.event.layer !== "event" ||
      !isEventInPrepSurfaceWindow(row.event.startMs, now)
    ) {
      return row;
    }
    return enrichCalendarRowWithTieredActions(row, now) ?? row;
  });

  const attachedActionCount = overlayRows.reduce(
    (sum, row) => sum + row.overlayActions.length,
    0,
  );

  return {
    eventChips: [...input.eventChips],
    actionChips,
    overlayRows,
    rowCount: overlayRows.length,
    attachedActionCount,
  };
}
