import type { UserStatusRecord, UserStatusWire } from "@/lib/global-brain/types";

const STORAGE_KEY = "rimvio-user-status.v1";
const HISTORY_KEY = "rimvio-user-status-history.v1";
const DEFAULT_TTL_HOURS = 36;

let statusRecord: UserStatusRecord | null = null;
let statusHistory: UserStatusRecord[] = [];

function readStatusJson(): UserStatusRecord | null {
  if (typeof window === "undefined") {
    return statusRecord;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as UserStatusRecord;
    if (!parsed?.flag || !parsed.updatedAt) {
      return null;
    }
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStatusJson(record: UserStatusRecord | null) {
  if (typeof window === "undefined") {
    statusRecord = record;
    return;
  }
  if (!record) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function readHistoryJson(): UserStatusRecord[] {
  if (typeof window === "undefined") {
    return [...statusHistory];
  }
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as UserStatusRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistoryJson(items: UserStatusRecord[]) {
  const trimmed = items.slice(0, 20);
  if (typeof window === "undefined") {
    statusHistory = trimmed;
    return;
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function resetUserStatusForTests(
  current: UserStatusRecord | null = null,
  history: UserStatusRecord[] = []
) {
  statusRecord = current;
  statusHistory = history;
  if (typeof window !== "undefined") {
    if (current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

export function readUserStatus(): UserStatusRecord | null {
  return readStatusJson();
}

export function upsertUserStatus(
  input: Omit<UserStatusRecord, "updatedAt" | "expiresAt"> & {
    updatedAt?: string;
    expiresAt?: string;
    ttlHours?: number;
  }
): UserStatusRecord {
  const now = input.updatedAt ?? new Date().toISOString();
  const ttlMs = (input.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
  const record: UserStatusRecord = {
    flag: input.flag,
    label: input.label,
    vitality: input.vitality,
    sourceMessage: input.sourceMessage?.trim().slice(0, 120) || undefined,
    updatedAt: now,
    expiresAt: input.expiresAt ?? new Date(Date.now() + ttlMs).toISOString(),
  };

  writeStatusJson(record);
  const history = [record, ...readHistoryJson().filter((item) => item.flag !== record.flag)].slice(
    0,
    20
  );
  writeHistoryJson(history);
  return record;
}

export function clearUserStatus() {
  writeStatusJson(null);
}

export function listRecentUserStatus(limit = 5): UserStatusRecord[] {
  return readHistoryJson().slice(0, limit);
}

export function serializeUserStatusForApi(): UserStatusWire | null {
  return readUserStatus();
}

export function applyUserStatusPatchFromApi(patch: UserStatusWire | null | undefined) {
  if (patch === null) {
    clearUserStatus();
    return;
  }
  if (!patch?.flag) {
    return;
  }
  upsertUserStatus(patch);
}
