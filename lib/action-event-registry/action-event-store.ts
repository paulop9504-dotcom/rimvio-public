import {
  detectActionEventKind,
  evaluateActionEventRegistry,
} from "@/lib/action-event-registry/evaluate-lifecycle";
import type {
  ActionEventEvaluated,
  ActionEventRecord,
} from "@/lib/action-event-registry/types";
import {
  actionEventUpsertToEventCandidate,
  eventCandidateToActionEventRecord,
  listActionEventRecordsFromCandidates,
} from "@/lib/events/event-candidate-action-adapter";
import {
  listEventCandidates,
  resetEventCandidatesForTests,
} from "@/lib/events/event-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

const LEGACY_STORAGE_KEY = "rimvio-action-events.v1";

function migrateLegacyStoreOnce() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as ActionEventRecord[];
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }
    for (const legacy of parsed) {
      if (!legacy?.targetTimeIso) {
        continue;
      }
      commitEventUpsert(
        actionEventUpsertToEventCandidate({
          task: legacy.task,
          placeName: legacy.placeName,
          targetTimeIso: legacy.targetTimeIso,
          sourceMessage: legacy.sourceMessage,
          phone: legacy.phone,
          priority: legacy.priority,
          id: legacy.id?.startsWith("ec-") ? legacy.id : undefined,
        }),
      );
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

/** @deprecated EventCandidate is SSOT — projected read for legacy API wire. */
export function resetActionEventsForTests(items: ActionEventRecord[] = []) {
  resetEventCandidatesForTests([]);
  for (const item of items) {
    commitEventUpsert(
      actionEventUpsertToEventCandidate({
        task: item.task,
        placeName: item.placeName,
        targetTimeIso: item.targetTimeIso,
        sourceMessage: item.sourceMessage,
        phone: item.phone,
        priority: item.priority,
        id: item.id,
      }),
    );
  }
}

/** @deprecated Use EventCandidate via event-store — projected for legacy callers. */
export function listActionEventRecords(): ActionEventRecord[] {
  migrateLegacyStoreOnce();
  return listActionEventRecordsFromCandidates(listEventCandidates());
}

export function listEvaluatedActionEvents(now?: Date): ActionEventEvaluated[] {
  return evaluateActionEventRegistry(listActionEventRecords(), now);
}

/** Writes EventCandidate SSOT; returns legacy ActionEventRecord projection. */
export function upsertActionEvent(input: {
  task: string;
  placeName?: string | null;
  targetTimeIso: string;
  sourceMessage: string;
  phone?: string | null;
  priority?: number;
  id?: string;
}): ActionEventRecord {
  const candidate = commitEventUpsert(actionEventUpsertToEventCandidate(input));
  const projected = eventCandidateToActionEventRecord(candidate);
  if (!projected) {
    const kind = detectActionEventKind(input.task, input.placeName ?? null);
    const nowIso = new Date().toISOString();
    return {
      id: candidate.id,
      task: input.task.trim().slice(0, 120),
      placeName: input.placeName?.trim() || null,
      targetTimeIso: input.targetTimeIso,
      kind,
      priority: input.priority ?? (kind === "airport_travel" ? 95 : 80),
      sourceMessage: input.sourceMessage.trim().slice(0, 200),
      createdAt: nowIso,
      updatedAt: nowIso,
      phone: input.phone ?? null,
    };
  }
  return projected;
}

export function serializeActionEventsForApi(now?: Date) {
  return listEvaluatedActionEvents(now).map((event) => ({
    id: event.id,
    task: event.task,
    place_name: event.placeName,
    target_time_iso: event.targetTimeIso,
    kind: event.kind,
    lifecycle: event.lifecycle,
    priority: event.priority,
    minutes_until: event.minutesUntil,
    active_window_minutes: event.activeWindowMinutes,
  }));
}

