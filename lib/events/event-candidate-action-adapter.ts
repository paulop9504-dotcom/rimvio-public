import {
  detectActionEventKind,
  type ActionEventKind,
} from "@/lib/action-event-registry/evaluate-lifecycle";
import type { ActionEventRecord } from "@/lib/action-event-registry/types";
import type {
  EventCandidate,
  EventCandidateCategory,
  EventCandidateUpsertInput,
} from "@/lib/events/event-candidate";

function categoryForKind(kind: ActionEventKind): EventCandidateCategory {
  return kind === "airport_travel" ? "travel" : "schedule";
}

function priorityFromMetadata(event: EventCandidate, kind: ActionEventKind): number {
  const raw = event.metadata?.priority;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  return kind === "airport_travel" ? 95 : 80;
}

/** @deprecated Read projection — canonical store is EventCandidate. */
export function eventCandidateToActionEventRecord(
  event: EventCandidate,
): ActionEventRecord | null {
  const targetTimeIso = event.datetime?.trim();
  if (!targetTimeIso) {
    return null;
  }

  const kind =
    (event.metadata?.actionEventKind as ActionEventKind | undefined) ??
    detectActionEventKind(event.title, event.place ?? null);

  const sourceMessage =
    typeof event.metadata?.sourceMessage === "string"
      ? event.metadata.sourceMessage
      : event.title;

  const phone =
    typeof event.metadata?.phone === "string" ? event.metadata.phone : null;

  return {
    id: event.id,
    task: event.title,
    placeName: event.place ?? null,
    targetTimeIso,
    kind,
    priority: priorityFromMetadata(event, kind),
    sourceMessage,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    phone,
  };
}

export function actionEventUpsertToEventCandidate(input: {
  task: string;
  placeName?: string | null;
  targetTimeIso: string;
  sourceMessage: string;
  phone?: string | null;
  priority?: number;
  id?: string;
}): EventCandidateUpsertInput {
  const placeName = input.placeName?.trim() || null;
  const kind = detectActionEventKind(input.task, placeName);

  return {
    id: input.id?.startsWith("ec-") ? input.id : undefined,
    title: input.task.trim().slice(0, 120),
    place: placeName ?? undefined,
    datetime: input.targetTimeIso,
    category: categoryForKind(kind),
    source: "message",
    lifecycle: "scheduled",
    confidence: 0.85,
    metadata: {
      sourceMessage: input.sourceMessage.trim().slice(0, 200),
      actionEventKind: kind,
      priority: input.priority ?? (kind === "airport_travel" ? 95 : 80),
      phone: input.phone ?? null,
      sourceRef: "action-event-registry",
    },
  };
}

export function listActionEventRecordsFromCandidates(
  events: readonly EventCandidate[],
): ActionEventRecord[] {
  return events
    .filter((event) => event.datetime && event.lifecycle !== "archived")
    .map(eventCandidateToActionEventRecord)
    .filter((record): record is ActionEventRecord => record !== null);
}
