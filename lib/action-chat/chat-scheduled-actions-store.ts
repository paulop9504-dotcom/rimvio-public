import type { ConfirmationExtractedData } from "@/lib/action-chat/confirmation-types";

export type PendingScheduledActionRecord = {
  scopeId: string;
  messageId: string;
  fireAt: string;
  extracted: ConfirmationExtractedData;
};

const STORAGE_KEY = "rimvio.scheduled-action-deliveries";

function readAll(): PendingScheduledActionRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingScheduledActionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: PendingScheduledActionRecord[]) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-40)));
}

export function readPendingScheduledActions(scopeId: string) {
  return readAll().filter((record) => record.scopeId === scopeId);
}

export function upsertPendingScheduledAction(record: PendingScheduledActionRecord) {
  const next = [
    record,
    ...readAll().filter(
      (item) => !(item.scopeId === record.scopeId && item.messageId === record.messageId)
    ),
  ];
  writeAll(next);
}

export function removePendingScheduledAction(scopeId: string, messageId: string) {
  writeAll(
    readAll().filter(
      (item) => !(item.scopeId === scopeId && item.messageId === messageId)
    )
  );
}
