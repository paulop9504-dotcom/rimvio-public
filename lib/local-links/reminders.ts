import {
  notifyReminder,
  pushRemindersToServiceWorker,
} from "@/lib/pwa/reminder-bridge";
import { ingestInternalReminder } from "@/lib/notification-shadow/ingest-adapters";
import {
  archiveLinkReminderEvent,
  ingestLinkReminderEvent,
} from "@/lib/events/link-reminder-ingest";

export type LinkReminder = {
  id: string;
  linkId: string;
  title: string;
  url: string;
  fireAt: string;
  createdAt: string;
};

const STORAGE_KEY = "blink-reminders";
export const LINK_REMINDERS_UPDATED = "rimvio-link-reminders-updated";
const DEFAULT_DELAY_MINUTES = 120;

let memoryReminders: LinkReminder[] = [];

export function resetLinkRemindersForTests(items: LinkReminder[] = []) {
  memoryReminders = items;
}

function readJson(): LinkReminder[] {
  if (typeof window === "undefined") {
    return [...memoryReminders];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as LinkReminder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(reminders: LinkReminder[]) {
  if (typeof window === "undefined") {
    memoryReminders = reminders;
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  window.dispatchEvent(new CustomEvent(LINK_REMINDERS_UPDATED));
}

function parseRemindAt(payload: Record<string, unknown> | undefined) {
  const at = payload?.at;
  if (typeof at === "string" && /^\d{1,2}:\d{2}$/.test(at.trim())) {
    const [hour, minute] = at.split(":").map(Number);
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next.getTime() <= Date.now()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  const delayMinutes =
    typeof payload?.delayMinutes === "number" && payload.delayMinutes > 0
      ? payload.delayMinutes
      : DEFAULT_DELAY_MINUTES;

  return new Date(Date.now() + delayMinutes * 60_000);
}

export function scheduleLinkReminderAt(input: {
  linkId: string;
  title: string;
  url: string;
  fireAt: string;
}) {
  const fireAt = new Date(input.fireAt);
  if (Number.isNaN(fireAt.getTime())) {
    throw new Error("invalid_fire_at");
  }

  const reminder: LinkReminder = {
    id: `remind-${crypto.randomUUID()}`,
    linkId: input.linkId,
    title: input.title.trim() || "저장한 링크",
    url: input.url,
    fireAt: fireAt.toISOString(),
    createdAt: new Date().toISOString(),
  };

  const next = [
    reminder,
    ...readJson().filter((item) => item.linkId !== input.linkId),
  ];

  writeJson(next);
  void pushRemindersToServiceWorker(next);
  ingestInternalReminder(reminder);
  ingestLinkReminderEvent(reminder);
  return reminder;
}

export function scheduleLinkReminder(input: {
  linkId: string;
  title: string;
  url: string;
  payload?: Record<string, unknown>;
}) {
  const fireAt = parseRemindAt(input.payload);
  const reminder: LinkReminder = {
    id: `remind-${crypto.randomUUID()}`,
    linkId: input.linkId,
    title: input.title.trim() || "저장한 링크",
    url: input.url,
    fireAt: fireAt.toISOString(),
    createdAt: new Date().toISOString(),
  };

  const next = [
    reminder,
    ...readJson().filter((item) => item.linkId !== input.linkId),
  ];

  writeJson(next);
  void pushRemindersToServiceWorker(next);
  ingestInternalReminder(reminder);
  ingestLinkReminderEvent(reminder);
  return reminder;
}

/** Read-only — no Event SSOT writes. Use syncLinkRemindersToEventStore before truth serialize. */
export function readLinkRemindersList(): LinkReminder[] {
  return readJson().sort(
    (left, right) =>
      new Date(left.fireAt).getTime() - new Date(right.fireAt).getTime(),
  );
}

/** @deprecated Prefer readLinkRemindersList — migration moved to syncLinkRemindersToEventStore. */
export function readLinkReminders(): LinkReminder[] {
  return readLinkRemindersList();
}

export function readLinkReminderForLink(linkId: string) {
  return readJson().find((item) => item.linkId === linkId) ?? null;
}

export function clearReminderByLinkId(linkId: string) {
  const existing = readJson().find((item) => item.linkId === linkId);
  if (!existing) {
    return;
  }
  clearReminder(existing.id);
}

export function clearReminder(id: string) {
  const removed = readJson().find((item) => item.id === id);
  if (removed) {
    archiveLinkReminderEvent(removed.linkId);
  }
  const next = readJson().filter((item) => item.id !== id);
  writeJson(next);
  void pushRemindersToServiceWorker(next);
}

export function readDueReminders(now = Date.now()) {
  return readJson().filter(
    (item) => new Date(item.fireAt).getTime() <= now
  );
}

export async function requestReminderPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showReminderNotification(reminder: LinkReminder) {
  void notifyReminder(reminder);
  return true;
}

export function formatReminderDelayLabel(payload?: Record<string, unknown>) {
  const at = payload?.at;
  if (typeof at === "string" && at.trim()) {
    return `오늘 ${at.trim()}`;
  }

  const delayMinutes =
    typeof payload?.delayMinutes === "number" && payload.delayMinutes > 0
      ? payload.delayMinutes
      : DEFAULT_DELAY_MINUTES;

  if (delayMinutes >= 60 && delayMinutes % 60 === 0) {
    return `${delayMinutes / 60}시간 뒤`;
  }

  return `${delayMinutes}분 뒤`;
}
