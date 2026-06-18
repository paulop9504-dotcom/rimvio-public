export type ParkingRecord = {
  id: string;
  location: string | null;
  photoDataUrl: string | null;
  createdAt: string;
  expiresAt: string;
};

export const PARKING_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const PARKING_RECORDS_UPDATED = "rimvio-parking-records-updated";
const STORAGE_KEY = "rimvio-parking-records";

let memoryRecords: ParkingRecord[] = [];

export function resetParkingRecordsForTests(items: ParkingRecord[] = []) {
  memoryRecords = items;
}

function readJson(): ParkingRecord[] {
  if (typeof window === "undefined") {
    return [...memoryRecords];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ParkingRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(records: ParkingRecord[]) {
  if (typeof window === "undefined") {
    memoryRecords = records;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(PARKING_RECORDS_UPDATED));
}

function pruneExpired(records: ParkingRecord[], now = Date.now()): ParkingRecord[] {
  return records.filter((record) => new Date(record.expiresAt).getTime() > now);
}

export function formatParkingRetentionLabel(expiresAt: string): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return "30일 보관";
  }
  return `${date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}까지 보관`;
}

export function saveParkingRecord(input: {
  location?: string | null;
  photoDataUrl?: string | null;
}): ParkingRecord {
  const now = new Date();
  const record: ParkingRecord = {
    id: `park-${crypto.randomUUID()}`,
    location: input.location?.trim() || null,
    photoDataUrl: input.photoDataUrl ?? null,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PARKING_RETENTION_MS).toISOString(),
  };

  const next = pruneExpired([
    record,
    ...readJson().filter((item) => item.id !== record.id),
  ]);
  writeJson(next);
  return record;
}

export function readParkingRecords(now = Date.now()): ParkingRecord[] {
  const items = pruneExpired(readJson(), now).sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  if (typeof window !== "undefined" && items.length !== readJson().length) {
    writeJson(items);
  }
  return items;
}

export function readLatestParkingRecord(): ParkingRecord | null {
  return readParkingRecords()[0] ?? null;
}
