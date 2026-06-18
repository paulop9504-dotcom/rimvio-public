import type { ContainerEvent, ContainerEventType } from "@/lib/container-store/types";

const EVENTS_KEY = "rimvio.container-events.v1";

let memoryEvents: ContainerEvent[] = [];

function readEvents(): ContainerEvent[] {
  if (typeof window === "undefined") {
    return [...memoryEvents];
  }
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ContainerEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: ContainerEvent[]) {
  if (typeof window === "undefined") {
    memoryEvents = events;
    return;
  }
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, 2000)));
}

export function resetContainerEventsForTests(events: ContainerEvent[] = []) {
  memoryEvents = events;
  if (typeof window !== "undefined") {
    localStorage.removeItem(EVENTS_KEY);
  }
}

export function appendContainerEvent(input: {
  container_id?: string | null;
  type: ContainerEventType;
  data: Record<string, unknown>;
}): ContainerEvent {
  const event: ContainerEvent = {
    id: `evt-${crypto.randomUUID()}`,
    container_id: input.container_id ?? null,
    type: input.type,
    data: input.data,
    created_at: new Date().toISOString(),
  };
  writeEvents([event, ...readEvents()]);
  return event;
}

export function listEventsForContainer(containerId: string, limit = 50): ContainerEvent[] {
  return readEvents()
    .filter((event) => event.container_id === containerId)
    .slice(0, limit);
}

export function countEventsForContainerSince(
  containerId: string,
  sinceMs: number
): number {
  const cutoff = Date.now() - sinceMs;
  return readEvents().filter(
    (event) =>
      event.container_id === containerId &&
      new Date(event.created_at).getTime() >= cutoff
  ).length;
}

export function countEventsByContainerSince(sinceMs: number): Map<string, number> {
  const cutoff = Date.now() - sinceMs;
  const counts = new Map<string, number>();
  for (const event of readEvents()) {
    if (!event.container_id) {
      continue;
    }
    if (new Date(event.created_at).getTime() < cutoff) {
      continue;
    }
    counts.set(event.container_id, (counts.get(event.container_id) ?? 0) + 1);
  }
  return counts;
}

export function listRecentEvents(limit = 50): ContainerEvent[] {
  return readEvents().slice(0, limit);
}
