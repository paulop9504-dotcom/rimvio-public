import { ingestNotification } from "@/lib/notification-shadow/route-notification";
import {
  applyFocusSessionRouteOverride,
  registerFocusHeldShadow,
} from "@/lib/action-chat/mention-focus/focus-notification-gate";
import type { ShadowProcessedRecord } from "@/lib/notification-shadow/types";
import {
  ingestNotificationEvent,
  migrateShadowRecordsToEventCandidates,
} from "@/lib/events/notification-ingest";

const STORAGE_KEY = "rimvio.shadow-store.v1";
export const SHADOW_STORE_UPDATED = "rimvio-shadow-store-updated";

let memoryStore: ShadowProcessedRecord[] = [];

function readStore(): ShadowProcessedRecord[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ShadowProcessedRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(records: ShadowProcessedRecord[]) {
  if (typeof window === "undefined") {
    memoryStore = records;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(SHADOW_STORE_UPDATED));
}

function pruneExpired(records: ShadowProcessedRecord[], now = Date.now()) {
  return records.filter((record) => {
    if (!record.shadow_record.store) {
      return false;
    }
    const ingested = new Date(record.ingested_at).getTime();
    const ttlMs = record.shadow_record.expires_in_hours * 60 * 60 * 1000;
    return ingested + ttlMs > now;
  });
}

export function resetShadowStoreForTests(records: ShadowProcessedRecord[] = []) {
  memoryStore = records;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function appendShadowRecord(record: ShadowProcessedRecord) {
  const routed = applyFocusSessionRouteOverride(record);
  let committed = routed;
  if (routed.shadow_record.store && routed.route !== "drop") {
    const event = ingestNotificationEvent(routed.raw, routed.id);
    committed = { ...routed, ecId: event.id };
  }

  if (!committed.shadow_record.store) {
    return committed;
  }
  registerFocusHeldShadow(committed);
  const next = pruneExpired([committed, ...readStore()]).slice(0, 500);
  writeStore(next);
  return committed;
}

export function ingestAndStore(
  input: Parameters<typeof ingestNotification>[0]
): ShadowProcessedRecord {
  const record = ingestNotification(input);
  return appendShadowRecord(record);
}

export function listShadowRecords(filter?: {
  route?: ShadowProcessedRecord["route"];
  minScore?: number;
}): ShadowProcessedRecord[] {
  let records = pruneExpired(readStore());
  migrateShadowRecordsToEventCandidates(records);
  if (filter?.route) {
    records = records.filter((record) => record.route === filter.route);
  }
  if (typeof filter?.minScore === "number") {
    records = records.filter((record) => record.priority_score >= filter.minScore!);
  }
  return records.sort((a, b) => b.priority_score - a.priority_score);
}

export function listActionStreamCandidates(): ShadowProcessedRecord[] {
  return listShadowRecords({ route: "action_stream" });
}

export function listPopupCandidates(): ShadowProcessedRecord[] {
  return listShadowRecords({ route: "popup" });
}

export function findShadowRecord(id: string) {
  return readStore().find((record) => record.id === id) ?? null;
}
