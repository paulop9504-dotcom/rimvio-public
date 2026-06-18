import type { ActionTelemetryEvent, ActionTelemetryKind } from "@/lib/archive/types";

const STORAGE_KEY = "rimvio.action-telemetry.v1";
const SHOWN_DEDUPE_MS = 24 * 60 * 60 * 1000;

let memoryStore: ActionTelemetryEvent[] = [];

function readStore(): ActionTelemetryEvent[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ActionTelemetryEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(events: ActionTelemetryEvent[]) {
  if (typeof window === "undefined") {
    memoryStore = events;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-2000)));
}

export function resetActionTelemetryForTests(events: ActionTelemetryEvent[] = []) {
  memoryStore = events;
  if (typeof window !== "undefined") {
    if (events.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function listActionTelemetryForEvent(eventId: string): ActionTelemetryEvent[] {
  return readStore()
    .filter((entry) => entry.eventId === eventId)
    .sort((left, right) => left.at.localeCompare(right.at));
}

export function listAllActionTelemetry(): ActionTelemetryEvent[] {
  return readStore();
}

function shouldSkipShownDuplicate(input: {
  eventId: string;
  actionId: string;
  surface?: string;
  impressionKey?: string;
  at: string;
}): boolean {
  const key = input.impressionKey ?? `${input.eventId}:${input.actionId}:${input.surface ?? "default"}`;
  const atMs = new Date(input.at).getTime();
  return readStore().some((entry) => {
    if (entry.kind !== "shown") {
      return false;
    }
    const entryKey =
      entry.impressionKey ?? `${entry.eventId}:${entry.actionId}:${entry.surface ?? "default"}`;
    if (entryKey !== key) {
      return false;
    }
    const entryMs = new Date(entry.at).getTime();
    return Math.abs(atMs - entryMs) < SHOWN_DEDUPE_MS;
  });
}

/** Append-only action telemetry — only write path for shown/clicked/executed/dismissed. */
export function appendActionTelemetry(input: {
  eventId: string;
  actionId: string;
  label: string;
  tier: ActionTelemetryEvent["tier"];
  kind: ActionTelemetryKind;
  at?: string;
  phase?: string;
  surface?: string;
  impressionKey?: string;
}): ActionTelemetryEvent | null {
  const at = input.at ?? new Date().toISOString();

  if (
    input.kind === "shown" &&
    shouldSkipShownDuplicate({
      eventId: input.eventId,
      actionId: input.actionId,
      surface: input.surface,
      impressionKey: input.impressionKey,
      at,
    })
  ) {
    return null;
  }

  const record: ActionTelemetryEvent = {
    id: `tel-${crypto.randomUUID()}`,
    eventId: input.eventId,
    actionId: input.actionId,
    label: input.label,
    tier: input.tier,
    phase: input.phase,
    kind: input.kind,
    at,
    surface: input.surface,
    impressionKey: input.impressionKey,
  };

  writeStore([...readStore(), record]);
  return record;
}
