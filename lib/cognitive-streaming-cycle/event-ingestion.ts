import type { EventStream } from "@/lib/cognitive-orchestrator/types";

export function sortEvents(events: readonly EventStream[]): EventStream[] {
  return [...events].sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return left.timestamp - right.timestamp;
    }
    return left.id.localeCompare(right.id);
  });
}

export function dedupeEvents(
  events: readonly EventStream[],
  debounceWindowMs: number,
  now: number
): EventStream[] {
  const byId = new Map<string, EventStream>();

  for (const event of sortEvents(events)) {
    const existing = byId.get(event.id);
    if (!existing) {
      byId.set(event.id, event);
      continue;
    }

    const withinWindow = Math.abs(event.timestamp - existing.timestamp) <= debounceWindowMs;
    const withinNowWindow = Math.abs(now - event.timestamp) <= debounceWindowMs;

    if (withinWindow || withinNowWindow) {
      if (event.timestamp >= existing.timestamp) {
        byId.set(event.id, event);
      }
      continue;
    }

    byId.set(event.id, event);
  }

  return sortEvents([...byId.values()]);
}

export function ingestEvents(
  pending: readonly EventStream[],
  existingPool: readonly EventStream[],
  maxEventsPerTick: number,
  debounceWindowMs: number,
  now: number
): { processedEvents: EventStream[]; nextPool: EventStream[] } {
  const merged = dedupeEvents([...existingPool, ...pending], debounceWindowMs, now);
  const existingIds = new Set(existingPool.map((event) => event.id));
  const newlyArrived = sortEvents(pending).filter((event) => !existingIds.has(event.id));

  const updatedExisting = pending.filter((event) => existingIds.has(event.id));
  const refreshCandidates = sortEvents([...newlyArrived, ...updatedExisting]);
  const processedEvents = refreshCandidates.slice(0, maxEventsPerTick);

  const processedIds = new Set(processedEvents.map((event) => event.id));
  const nextPool = merged.map((event) => {
    const refreshed = processedEvents.find((entry) => entry.id === event.id);
    return refreshed ?? event;
  });

  if (processedEvents.length === 0 && pending.length > 0) {
    const fallback = dedupeEvents(pending, debounceWindowMs, now).slice(0, maxEventsPerTick);
    return {
      processedEvents: fallback,
      nextPool: dedupeEvents([...existingPool, ...fallback], debounceWindowMs, now),
    };
  }

  return {
    processedEvents: sortEvents(processedEvents),
    nextPool: sortEvents(nextPool.filter((event, index, array) => {
      return array.findIndex((entry) => entry.id === event.id) === index;
    })),
  };
}

export function trimEventPool(
  pool: readonly EventStream[],
  maxSize: number
): { pool: EventStream[]; trimmed: number } {
  if (pool.length <= maxSize) {
    return { pool: sortEvents(pool), trimmed: 0 };
  }

  const sorted = sortEvents(pool);
  const trimmed = sorted.length - maxSize;
  return {
    pool: sorted.slice(trimmed),
    trimmed,
  };
}
