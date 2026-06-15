import type { ActiveActionEntry } from "@/lib/action-chat/active-actions-registry";
import {
  computeActionCountdown,
  computeStudyCountUpElapsed,
  formatActionTargetClock,
  parseActionTargetDatetime,
} from "@/lib/action-chat/action-countdown";
import type { StudyFocusTimerPayload } from "@/lib/contextual-aux/study/save-study-focus-timer";
import type { CalendarEventChip } from "@/lib/calendar/calendar-view-types";
import type { KnowledgeEntity } from "@/lib/knowledge/knowledge-entity-types";
import { FIXED_CALENDAR_CONTAINER_ID } from "@/lib/knowledge/knowledge-entity-types";

function dateKeyFrom(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseStudyFocusPayload(value: string): StudyFocusTimerPayload | null {
  try {
    const parsed = JSON.parse(value) as StudyFocusTimerPayload;
    if (parsed?.mode === "count_up" && parsed.category === "study" && parsed.startedAt) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function toStudyFocusEntry(
  payload: StudyFocusTimerPayload,
  entityId: string,
): ActiveActionEntry {
  const elapsed = computeStudyCountUpElapsed(payload.startedAt);
  return {
    id: `ke:${entityId}:study-focus`,
    messageId: null,
    linkId: null,
    reminderId: null,
    kind: "study_focus",
    title: payload.label,
    subtitle: `${formatActionTargetClock(payload.startedAt)} 시작`,
    fireAt: payload.startedAt,
    placeName: null,
    actionCount: 0,
    countdownLabel: elapsed?.headline ?? null,
  };
}

function entityToChip(entity: KnowledgeEntity, now = new Date()): CalendarEventChip | null {
  if (entity.containerId !== FIXED_CALENDAR_CONTAINER_ID) {
    return null;
  }

  const focus = parseStudyFocusPayload(entity.value);
  if (focus) {
    const started = parseActionTargetDatetime(focus.startedAt);
    if (!started) {
      return null;
    }
    const entry = toStudyFocusEntry(focus, entity.id);
    return {
      id: `ke:${entity.id}`,
      layer: "action",
      eventId: null,
      entry,
      title: focus.label,
      dateKey: dateKeyFrom(started),
      startMs: started.getTime(),
      hour: started.getHours(),
      minute: started.getMinutes(),
      tone: "blue",
      hasTime: true,
    };
  }

  if (entity.type !== "schedule") {
    return null;
  }

  const when =
    parseActionTargetDatetime(entity.scheduledAt ?? entity.value) ??
    parseActionTargetDatetime(entity.createdAt);
  if (!when) {
    return null;
  }

  return {
    id: `ke:${entity.id}`,
    layer: "action",
    eventId: null,
    entry: {
      id: `ke:${entity.id}:schedule`,
      messageId: null,
      linkId: null,
      reminderId: null,
      kind: "revealed_actions",
      title: entity.label,
      subtitle: entity.sourceMessage ?? "저장된 일정",
      fireAt: when.toISOString(),
      placeName: null,
      actionCount: 0,
      countdownLabel: computeActionCountdown(when.toISOString())?.headline ?? null,
    },
    title: entity.label,
    dateKey: dateKeyFrom(when),
    startMs: when.getTime(),
    hour: when.getHours(),
    minute: when.getMinutes(),
    tone: "green",
    hasTime: true,
  };
}

/** Knowledge calendar container → action-layer chips (persisted timers/schedules). */
export function projectKnowledgeCalendarChips(
  entities: readonly KnowledgeEntity[],
  now = new Date(),
): CalendarEventChip[] {
  return entities
    .map((entity) => entityToChip(entity, now))
    .filter((chip): chip is CalendarEventChip => chip !== null);
}

export function dedupeCalendarChips(
  chips: readonly CalendarEventChip[],
): CalendarEventChip[] {
  const seen = new Set<string>();
  const result: CalendarEventChip[] = [];

  for (const chip of chips) {
    const key =
      chip.entry?.kind === "study_focus" && chip.entry.fireAt
        ? `study:${chip.entry.fireAt}`
        : chip.id;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(chip);
  }

  return result;
}
