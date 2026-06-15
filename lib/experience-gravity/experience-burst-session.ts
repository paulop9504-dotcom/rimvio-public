const STORAGE_KEY = "rimvio-experience-burst.v1";
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

type BurstSessionEntry = {
  burstId: string;
  shownAtIso: string;
};

let memoryEntries: BurstSessionEntry[] = [];

function readEntries(): BurstSessionEntry[] {
  if (typeof window === "undefined") {
    return memoryEntries;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as BurstSessionEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: BurstSessionEntry[]) {
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

export function canSurfaceExperienceBurst(
  burstId: string,
  now = new Date(),
): boolean {
  const key = burstId.trim();
  if (!key) {
    return false;
  }

  const nowMs = now.getTime();
  const last = readEntries()
    .filter((entry) => entry.burstId === key)
    .sort(
      (left, right) =>
        Date.parse(right.shownAtIso) - Date.parse(left.shownAtIso),
    )[0];

  if (!last) {
    return true;
  }

  const lastMs = Date.parse(last.shownAtIso);
  return !Number.isNaN(lastMs) && nowMs - lastMs >= COOLDOWN_MS;
}

export function markExperienceBurstShown(burstId: string, now = new Date()) {
  const key = burstId.trim();
  if (!key) {
    return;
  }
  const entries = readEntries();
  entries.push({ burstId: key, shownAtIso: now.toISOString() });
  writeEntries(entries.slice(-30));
}

export function resetExperienceBurstSessionForTests() {
  memoryEntries = [];
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
