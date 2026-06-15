/**
 * Event Candidate persistence — internal storage only.
 * Application writes must go through `lib/source-of-truth/commit-truth.ts`.
 */
import type {
  EventCandidate,
  EventCandidateLifecycle,
  EventCandidateUpsertInput,
} from "@/lib/events/event-candidate";
import { invalidateActionProjection } from "@/lib/action-projection/action-projection-cache";
import {
  advanceEventLifecycle,
  initialLifecycle,
  mergeLifecycle,
  pruneExpiredEvents,
} from "@/lib/events/event-lifecycle";
import { foldArchivedEvent } from "@/lib/events/fold-archived-event";
import { assertAllowedLifecycleMutation } from "@/lib/event-kernel/schema-lock/mutation-rules";
import { eventCandidateContentEqual } from "@/lib/events/event-candidate-equal";

const STORAGE_KEY = "rimvio-event-candidates.v1";
export const EVENT_CANDIDATES_UPDATED = "rimvio-event-candidates-updated";

let memoryStore: EventCandidate[] = [];

function readPayload(): EventCandidate[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as EventCandidate[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.title === "string")
      : [];
  } catch {
    return [];
  }
}

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_CANDIDATES_UPDATED));
  }
}

function writePayload(items: EventCandidate[]) {
  if (typeof window === "undefined") {
    memoryStore = items;
    invalidateActionProjection();
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  invalidateActionProjection();
  emitUpdated();
}

function sourceMessageOf(item: EventCandidate | EventCandidateUpsertInput): string {
  const raw = item.metadata?.sourceMessage;
  return typeof raw === "string" ? raw.trim() : "";
}

function messageIdFromInput(input: EventCandidateUpsertInput): string {
  const raw = input.metadata?.sourceMessageId ?? input.metadata?.messageId;
  return typeof raw === "string" ? raw.trim() : "";
}

function messageIdOf(item: EventCandidate): string {
  const meta = item.metadata ?? {};
  const sourceMessageId =
    typeof meta.sourceMessageId === "string" ? meta.sourceMessageId.trim() : "";
  if (sourceMessageId) {
    return sourceMessageId;
  }
  return typeof meta.messageId === "string" ? meta.messageId.trim() : "";
}

function normalizeRecord(input: EventCandidateUpsertInput, nowIso: string): EventCandidate {
  return {
    id: input.id ?? `ec-${crypto.randomUUID()}`,
    title: input.title,
    category: input.category,
    source: input.source,
    lifecycle: input.lifecycle ?? initialLifecycle(),
    datetime: input.datetime,
    place: input.place,
    containerId: input.containerId,
    confidence: input.confidence,
    metadata: input.metadata,
    lifecycleUpdatedAt: input.lifecycleUpdatedAt ?? nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

function findMatchingIndex(
  items: EventCandidate[],
  input: EventCandidateUpsertInput
): number {
  if (input.id) {
    const byId = items.findIndex((item) => item.id === input.id);
    if (byId >= 0) {
      return byId;
    }
  }

  const messageId = messageIdFromInput(input);
  if (messageId) {
    const byMessageId = items.findIndex((item) => messageIdOf(item) === messageId);
    if (byMessageId >= 0) {
      return byMessageId;
    }
  }

  const normalized = sourceMessageOf(input);
  if (!normalized) {
    return -1;
  }

  return items.findIndex((item) => sourceMessageOf(item) === normalized);
}

export function resetEventCandidatesForTests(items: EventCandidate[] = []) {
  memoryStore = items;
  if (typeof window !== "undefined") {
    if (items.length) {
      writePayload(items);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function listEventCandidates(): EventCandidate[] {
  return pruneExpiredEvents(readPayload());
}

export function listEventCandidatesByLifecycle(
  lifecycle: EventCandidateLifecycle
): EventCandidate[] {
  return listEventCandidates().filter((item) => item.lifecycle === lifecycle);
}

export function findEventCandidate(id: string): EventCandidate | null {
  return readPayload().find((item) => item.id === id) ?? null;
}

export function findEventBySourceMessage(sourceMessage: string): EventCandidate | null {
  const normalized = sourceMessage.trim();
  if (!normalized) {
    return null;
  }
  return (
    listEventCandidates().find((item) => sourceMessageOf(item) === normalized) ?? null
  );
}

/** Resolve legacy msg:* / messageId keys to EventCandidate. */
export function findEventCandidateByMessageId(messageId: string): EventCandidate | null {
  const normalized = messageId.trim();
  if (!normalized) {
    return null;
  }
  return listEventCandidates().find((item) => messageIdOf(item) === normalized) ?? null;
}

export function findEventCandidateByLinkId(linkId: string): EventCandidate | null {
  const normalized = linkId.trim();
  if (!normalized) {
    return null;
  }
  const byId = findEventCandidate(`ec-link-${normalized}`);
  if (byId) {
    return byId;
  }
  return (
    listEventCandidates().find(
      (item) => item.metadata?.linkId === normalized,
    ) ?? null
  );
}

export function findLatestOpenEvent(): EventCandidate | null {
  const open = listEventCandidates().filter(
    (item) => item.lifecycle !== "archived" && item.lifecycle !== "completed"
  );
  return open[0] ?? null;
}

/** Sole lifecycle mutation API — all transitions go through the store. */
export function transitionEventLifecycle(
  eventId: string,
  next: EventCandidateLifecycle
): EventCandidate | null {
  const items = readPayload();
  const index = items.findIndex((item) => item.id === eventId);
  if (index < 0) {
    return null;
  }

  const current = items[index]!;
  if (current.lifecycle !== next) {
    assertAllowedLifecycleMutation(current.lifecycle, next);
  }

  const advanced = advanceEventLifecycle(current, next);
  if (advanced.lifecycle === current.lifecycle) {
    return advanced;
  }

  let committed = advanced;
  if (next === "archived") {
    const fold = foldArchivedEvent(advanced);
    if (fold.ok && fold.folded) {
      committed = {
        ...advanced,
        metadata: {
          ...advanced.metadata,
          archiveFoldedAt: new Date().toISOString(),
          archiveId: fold.archiveId,
        },
      };
    } else if (fold.ok) {
      committed = {
        ...advanced,
        metadata: {
          ...advanced.metadata,
          archiveFoldPending: true,
        },
      };
    }
  }

  const nextItems = [...items];
  nextItems[index] = committed;
  writePayload(pruneExpiredEvents(nextItems));
  return committed;
}

/** @deprecated use transitionEventLifecycle */
export const advanceEventLifecycleById = transitionEventLifecycle;

export function upsertEventCandidate(input: EventCandidateUpsertInput): EventCandidate {
  const nowIso = new Date().toISOString();
  const items = readPayload();
  const index = findMatchingIndex(items, input);

  if (index >= 0) {
    const existing = items[index]!;
    const next: EventCandidate = {
      ...existing,
      ...input,
      id: existing.id,
      lifecycle: mergeLifecycle(existing.lifecycle, input.lifecycle ?? existing.lifecycle),
      metadata: { ...existing.metadata, ...input.metadata },
      lifecycleUpdatedAt:
        mergeLifecycle(existing.lifecycle, input.lifecycle ?? existing.lifecycle) !==
        existing.lifecycle
          ? nowIso
          : existing.lifecycleUpdatedAt ?? existing.updatedAt,
      createdAt: existing.createdAt,
      updatedAt: nowIso,
    };
    if (eventCandidateContentEqual(existing, next)) {
      return existing;
    }
    const nextItems = items.map((item, i) => (i === index ? next : item));
    writePayload(pruneExpiredEvents(nextItems));
    return next;
  }

  const record = normalizeRecord(input, nowIso);
  writePayload(pruneExpiredEvents([record, ...items]));
  return record;
}

export function replaceEventCandidatesForTests(items: EventCandidate[]) {
  writePayload(items);
}

export function readEventCandidatesRaw(): EventCandidate[] {
  return readPayload();
}

export function writeEventCandidatesRaw(items: EventCandidate[]) {
  writePayload(pruneExpiredEvents(items));
}
