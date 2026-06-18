import type { CognitiveEvent, CognitiveEventType } from "@/lib/context-builder/types";
import type { EventStream } from "@/lib/cognitive-orchestrator/types";

const COGNITIVE_EVENT_TYPES = new Set<CognitiveEventType>([
  "Event",
  "Opportunity",
  "Behavior",
  "Notification",
  "Container",
]);

type EventStreamPayload = {
  tags?: unknown;
  embedding?: unknown;
  engaged?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function normalizeEventType(type: string): CognitiveEventType {
  const normalized = type.trim();
  if (COGNITIVE_EVENT_TYPES.has(normalized as CognitiveEventType)) {
    return normalized as CognitiveEventType;
  }
  return "Event";
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is number => typeof entry === "number");
}

export function eventStreamToCognitive(event: EventStream): CognitiveEvent {
  const payload: EventStreamPayload = isRecord(event.payload) ? event.payload : {};

  return {
    id: event.id,
    type: normalizeEventType(event.type),
    timestamp: event.timestamp,
    tags: readStringArray(payload.tags),
    embedding: readNumberArray(payload.embedding),
    engaged: payload.engaged === true,
  };
}

export function resolveCycleNow(eventStream: readonly EventStream[], now?: number): number {
  if (now != null) {
    return now;
  }
  if (eventStream.length === 0) {
    return Date.now();
  }
  return Math.max(...eventStream.map((event) => event.timestamp));
}

export function sortEventStream(eventStream: readonly EventStream[]): EventStream[] {
  return [...eventStream].sort((left, right) => {
    if (left.timestamp !== right.timestamp) {
      return left.timestamp - right.timestamp;
    }
    return left.id.localeCompare(right.id);
  });
}

export function toCognitiveEvents(eventStream: readonly EventStream[]): CognitiveEvent[] {
  return sortEventStream(eventStream).map(eventStreamToCognitive);
}
