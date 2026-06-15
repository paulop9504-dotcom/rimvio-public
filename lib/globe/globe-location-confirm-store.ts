const STORAGE_KEY = "rimvio.globe-location-confirm.v1";

type GlobeLocationConfirmRecord = {
  placeKey: string;
  dayKey: string;
  confirmedAtIso: string;
};

let memoryRecords: GlobeLocationConfirmRecord[] = [];

function normalizePlaceKey(place: string): string {
  return place.trim().toLowerCase().replace(/\s+/g, " ");
}

function localDayKey(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) {
    return localDayKey(null);
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function readRecords(): GlobeLocationConfirmRecord[] {
  if (typeof window === "undefined") {
    return [...memoryRecords];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as GlobeLocationConfirmRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: GlobeLocationConfirmRecord[]) {
  memoryRecords = records;
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-120)));
  } catch {
    // ignore
  }
}

export function resetGlobeLocationConfirmStoreForTests(
  records: GlobeLocationConfirmRecord[] = [],
) {
  memoryRecords = records;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export function markGlobeLocationConfirmed(
  place: string,
  datetime?: string | null,
): void {
  const placeKey = normalizePlaceKey(place);
  if (!placeKey) {
    return;
  }
  const dayKey = localDayKey(datetime);
  const records = readRecords().filter(
    (row) => !(row.placeKey === placeKey && row.dayKey === dayKey),
  );
  records.push({
    placeKey,
    dayKey,
    confirmedAtIso: new Date().toISOString(),
  });
  writeRecords(records);
}

export function isGlobeLocationConfirmed(
  place: string,
  datetime?: string | null,
): boolean {
  const placeKey = normalizePlaceKey(place);
  if (!placeKey) {
    return false;
  }
  const dayKey = localDayKey(datetime);
  return readRecords().some(
    (row) => row.placeKey === placeKey && row.dayKey === dayKey,
  );
}
