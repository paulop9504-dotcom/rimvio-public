import { parseActionTargetDatetime } from "@/lib/action-chat/action-countdown";
import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import type { ActionCalendarSnapshot } from "@/lib/calendar/build-action-calendar";
import type {
  CalendarChipTone,
  CalendarEventChip,
  CalendarOverlayAction,
  UnifiedCalendarOverlayRow,
} from "@/lib/calendar/calendar-view-types";
import { resolveCalendarScheduleOrigin } from "@/lib/calendar/resolve-calendar-schedule-origin";
import { composeUnifiedCalendarOverlay } from "@/lib/calendar/compose-unified-calendar-overlay";
import {
  dedupeCalendarChips,
  projectKnowledgeCalendarChips,
} from "@/lib/calendar/project-knowledge-calendar-chips";
import { projectCalendarEvents } from "@/lib/calendar/project-action-stream";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import type { RankedSurface, SurfaceAction } from "@/lib/surface-engine/surface-contract";

function toneForType(type: RankedSurface["type"]): CalendarChipTone {
  switch (type) {
    case "travel":
      return "blue";
    case "work":
      return "grey";
    case "food":
    case "social":
      return "green";
    default:
      return "teal";
  }
}

function dateKeyFrom(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function surfaceToEventChip(surface: RankedSurface, anchor: Date): CalendarEventChip | null {
  const ref = surface.events[0];
  if (!ref?.startAt) {
    return null;
  }
  const parsed = parseActionTargetDatetime(ref.startAt);
  if (!parsed) {
    return null;
  }
  return {
    id: `surface-event:${surface.id}`,
    layer: "event",
    eventId: ref.eventId,
    entry: null,
    title: surface.title,
    dateKey: dateKeyFrom(parsed),
    startMs: parsed.getTime(),
    hour: parsed.getHours(),
    minute: parsed.getMinutes(),
    tone: toneForType(surface.type),
    hasTime: ref.startAt.includes("T"),
    scheduleOrigin: resolveCalendarScheduleOrigin({
      sourceRef: ref.sourceRef,
      eventId: ref.eventId,
    }),
  };
}

function surfaceActionToOverlay(
  action: SurfaceAction,
  tier: "MAIN" | "AUX",
): CalendarOverlayAction {
  return {
    id: action.id,
    label: action.label,
    source: "projection",
    action_tier: tier,
    ranking_why: tier === "MAIN" ? action.label : null,
  };
}

export function surfacesToEventChips(
  surfaces: readonly RankedSurface[],
  anchor = new Date(),
): CalendarEventChip[] {
  return surfaces
    .map((surface) => surfaceToEventChip(surface, anchor))
    .filter((chip): chip is CalendarEventChip => chip !== null);
}

export function surfacesToOverlayRows(
  surfaces: readonly RankedSurface[],
  anchor = new Date(),
  now = new Date(),
): UnifiedCalendarOverlayRow[] {
  const eventChips = surfacesToEventChips(surfaces, anchor);
  const actionChips: CalendarEventChip[] = [];

  const rows = composeUnifiedCalendarOverlay(eventChips, actionChips, now);
  const byEventId = new Map(surfaces.map((s) => [s.events[0]?.eventId, s]));

  return rows.map((row) => {
    const surface = row.event.eventId ? byEventId.get(row.event.eventId) : undefined;
    if (!surface) {
      return row;
    }
    const overlayActions: CalendarOverlayAction[] = [
      surfaceActionToOverlay(surface.primaryAction, "MAIN"),
      ...surface.secondaryActions
        .filter((a) => a.intent !== "dismiss_surface")
        .slice(0, 3)
        .map((a) => surfaceActionToOverlay(a, "AUX")),
    ];
    return {
      ...row,
      overlayActions,
      context_lines: surface.narration ? [surface.narration.summary] : row.context_lines,
      prompt_hint: surface.description,
    };
  });
}

/** Calendar channel surfaces + chat stream → unified calendar snapshot. */
export function buildCalendarSnapshotFromSurfaces(input: {
  calendarSurfaces: readonly RankedSurface[];
  streamActions: readonly ActiveActionEntry[];
  knowledgeEntities?: readonly KnowledgeEntity[];
  anchor?: Date;
  now?: Date;
}): ActionCalendarSnapshot {
  const anchor = input.anchor ?? new Date();
  const now = input.now ?? new Date();
  const eventChips = surfacesToEventChips(input.calendarSurfaces, anchor);
  const streamChips = projectCalendarEvents(input.streamActions, anchor);
  const knowledgeChips = projectKnowledgeCalendarChips(
    input.knowledgeEntities ?? [],
    now,
  );
  const actionChips = dedupeCalendarChips([...streamChips, ...knowledgeChips]);
  const overlayRows = surfacesToOverlayRows(input.calendarSurfaces, anchor, now);

  const merged = composeUnifiedCalendarOverlay(eventChips, actionChips, now);
  const overlayById = new Map(overlayRows.map((row) => [row.id, row]));
  const finalRows = merged.map((row) => overlayById.get(row.id) ?? row);

  return {
    eventChips,
    actionChips,
    overlayRows: finalRows,
    rowCount: finalRows.length,
    attachedActionCount: finalRows.reduce(
      (sum, row) => sum + row.overlayActions.length,
      0,
    ),
  };
}
