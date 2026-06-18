const STORAGE_KEY = "rimvio-gps-arrival-recall.v1";
const COOLDOWN_MS = 12 * 60 * 60 * 1000;
const MAX_PER_DAY = 2;

type RecallSessionEntry = {
  placeKey: string;
  shownAtIso: string;
};

let memoryEntries: RecallSessionEntry[] = [];

function readEntries(): RecallSessionEntry[] {
  if (typeof window === "undefined") {
    return memoryEntries;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RecallSessionEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: RecallSessionEntry[]) {
  if (typeof window === "undefined") {
    memoryEntries = entries;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota
  }
}

/** Max 1–2 arrival recall surfaces per day per place — Recall Timing Law. */
export function canSurfaceGpsArrivalRecall(
  placeKey: string,
  now = new Date(),
): boolean {
  const key = placeKey.trim().toLowerCase();
  if (!key) {
    return false;
  }

  const nowMs = now.getTime();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();

  const entries = readEntries().filter((entry) => {
    const ms = Date.parse(entry.shownAtIso);
    return !Number.isNaN(ms) && ms >= dayStartMs - 86_400_000;
  });

  const todayCount = entries.filter((entry) => {
    const ms = Date.parse(entry.shownAtIso);
    return !Number.isNaN(ms) && ms >= dayStartMs;
  }).length;

  if (todayCount >= MAX_PER_DAY) {
    return false;
  }

  const lastForPlace = entries
    .filter((entry) => entry.placeKey === key)
    .sort(
      (left, right) =>
        Date.parse(right.shownAtIso) - Date.parse(left.shownAtIso),
    )[0];

  if (!lastForPlace) {
    return true;
  }

  const lastMs = Date.parse(lastForPlace.shownAtIso);
  return !Number.isNaN(lastMs) && nowMs - lastMs >= COOLDOWN_MS;
}

export function markGpsArrivalRecallShown(placeKey: string, now = new Date()) {
  const key = placeKey.trim().toLowerCase();
  if (!key) {
    return;
  }
  const entries = readEntries();
  entries.push({ placeKey: key, shownAtIso: now.toISOString() });
  writeEntries(entries.slice(-40));
}

export function resetGpsArrivalRecallSessionForTests() {
  memoryEntries = [];
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
