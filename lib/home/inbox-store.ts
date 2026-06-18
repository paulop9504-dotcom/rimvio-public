import { shouldQueueInbox } from "@/lib/data-architect/confidence";
import type { DataArchitectWire } from "@/lib/data-architect/types";

export type InboxItem = {
  id: string;
  preview: string;
  confidence: number;
  action: DataArchitectWire["action"];
  linkId?: string | null;
  linkTitle?: string | null;
  created_at: string;
  resolved_at?: string | null;
};

const INBOX_KEY = "rimvio.home-inbox.v1";
export const HOME_INBOX_UPDATED = "rimvio:home-inbox-updated";

let memoryInbox: InboxItem[] = [];

function readInbox(): InboxItem[] {
  if (typeof window === "undefined") {
    return [...memoryInbox];
  }
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as InboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInbox(items: InboxItem[]) {
  if (typeof window === "undefined") {
    memoryInbox = items;
    return;
  }
  localStorage.setItem(INBOX_KEY, JSON.stringify(items.slice(0, 200)));
  window.dispatchEvent(new CustomEvent(HOME_INBOX_UPDATED));
}

export function resetHomeInboxForTests(items: InboxItem[] = []) {
  memoryInbox = items;
  if (typeof window !== "undefined") {
    localStorage.removeItem(INBOX_KEY);
  }
}

export function listPendingInboxItems(): InboxItem[] {
  return readInbox().filter((item) => !item.resolved_at);
}

export function countPendingInboxItems(): number {
  return listPendingInboxItems().length;
}

export function appendInboxItem(input: {
  preview: string;
  confidence: number;
  action: DataArchitectWire["action"];
  linkId?: string | null;
  linkTitle?: string | null;
}): InboxItem {
  const existing = readInbox().find(
    (item) =>
      !item.resolved_at &&
      ((input.linkId && item.linkId === input.linkId) ||
        item.preview.trim() === input.preview.trim())
  );
  if (existing) {
    return existing;
  }

  const created: InboxItem = {
    id: `inbox-${crypto.randomUUID()}`,
    preview: input.preview.trim().slice(0, 280),
    confidence: input.confidence,
    action: input.action,
    linkId: input.linkId ?? null,
    linkTitle: input.linkTitle ?? null,
    created_at: new Date().toISOString(),
  };

  writeInbox([created, ...readInbox()]);
  return created;
}

export function getInboxItemById(id: string): InboxItem | null {
  return readInbox().find((item) => item.id === id) ?? null;
}

export function resolveInboxItem(id: string): void {
  const next = readInbox().map((item) =>
    item.id === id ? { ...item, resolved_at: new Date().toISOString() } : item
  );
  writeInbox(next);
}

export function queueInboxFromWire(input: {
  wire: DataArchitectWire;
  preview: string;
  linkId?: string | null;
  linkTitle?: string | null;
}): InboxItem | null {
  if (!shouldQueueInbox(input.wire)) {
    return null;
  }

  return appendInboxItem({
    preview: input.preview,
    confidence: input.wire.confidence ?? 0.3,
    action: input.wire.action,
    linkId: input.linkId,
    linkTitle: input.linkTitle,
  });
}
