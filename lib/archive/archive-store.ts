import type { ArchivedEvent } from "@/lib/archive/types";

const STORAGE_KEY = "rimvio.event-archive.v1";

let memoryStore: ArchivedEvent[] = [];

function readStore(): ArchivedEvent[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ArchivedEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(events: ArchivedEvent[]) {
  if (typeof window === "undefined") {
    memoryStore = events;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function resetArchiveStoreForTests(events: ArchivedEvent[] = []) {
  memoryStore = events;
  if (typeof window !== "undefined") {
    if (events.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function listArchivedEvents(): ArchivedEvent[] {
  return readStore().sort((left, right) =>
    right.archivedAt.localeCompare(left.archivedAt),
  );
}

export function findArchivedEvent(archiveId: string): ArchivedEvent | null {
  return readStore().find((entry) => entry.archiveId === archiveId) ?? null;
}

export function findArchivedEventByEventId(eventId: string): ArchivedEvent | null {
  return (
    readStore().find((entry) => entry.event.eventId === eventId) ??
    null
  );
}

/** Append-only — duplicate archiveId is ignored (fold idempotency). */
export function appendArchivedEvent(event: ArchivedEvent): ArchivedEvent {
  if (findArchivedEvent(event.archiveId)) {
    return event;
  }
  writeStore([event, ...readStore()]);
  return event;
}
