import type { BlinkAnalyticsEvent, BlinkAnalyticsEventInput } from "@/lib/analytics/types";
import { readAnalyticsFlowId } from "@/lib/analytics/flow";
import { flushAnalyticsEvent } from "@/lib/analytics/flush-client";

const EVENTS_KEY = "blink-analytics-events";
const SESSION_KEY = "blink-analytics-session-id";
const MAX_EVENTS = 800;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAnalyticsSessionId(): string {
  if (!isBrowser()) {
    return "server";
  }

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

export function readAnalyticsEvents(): BlinkAnalyticsEvent[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as BlinkAnalyticsEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAnalyticsEvents(events: BlinkAnalyticsEvent[]) {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function appendAnalyticsEvent(event: BlinkAnalyticsEventInput) {
  if (!isBrowser()) {
    return;
  }

  const next: BlinkAnalyticsEvent = {
    ...event,
    ts: Date.now(),
    sessionId: getAnalyticsSessionId(),
    flowId: readAnalyticsFlowId(),
  } as BlinkAnalyticsEvent;

  const events = readAnalyticsEvents();
  events.push(next);

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  writeAnalyticsEvents(events);
  flushAnalyticsEvent(next);
}

export function clearAnalyticsEvents() {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(EVENTS_KEY);
}

export function exportAnalyticsEventsJson(pretty = true): string {
  return JSON.stringify(readAnalyticsEvents(), null, pretty ? 2 : 0);
}
